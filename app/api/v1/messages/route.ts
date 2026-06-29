import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { resolveSubKey } from "@/lib/keys";
import { checkBudget, logUsage, calculateCost } from "@/lib/usage";
import { buildPromptHash, lookupCache, storeCache } from "@/lib/cache";
import { applyRouting } from "@/lib/router";
import {
  selectKeyFromPool,
  markRateLimited,
  incrementRequestCount,
  isRateLimited,
  parseRetryAfter,
  MAX_RETRIES,
} from "@/lib/keypool";
import { rateLimitOrPass } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const log = createLogger("proxy");

export const dynamic = "force-dynamic";

const ANTHROPIC_BASE =
  process.env.ANTHROPIC_UPSTREAM_URL ?? "https://api.anthropic.com";

function err(status: number, message: string, type = "invalid_request_error") {
  return NextResponse.json(
    { type: "error", error: { type, message } },
    { status },
  );
}

async function fireAlerts(
  subKeyId: string,
  workspaceId: string,
  label: string,
  spentUsd: number,
  budgetUsd: number | null,
) {
  if (!budgetUsd) return;
  try {
    const { checkAndFireAlerts } = await import("@/lib/alerts");
    await checkAndFireAlerts({
      subKeyId,
      workspaceId,
      keyLabel: label,
      spentUsd,
      budgetUsd,
    });
  } catch (e) {
    log.error({ err: e }, "Alert check failed");
  }
}

// ── Get cache settings for workspace ──────────────────────────────────────────
async function getCacheConfig(
  workspaceId: string,
): Promise<{ enabled: boolean; ttlHours: number }> {
  try {
    const { serviceSupabase } = await import("@/lib/supabase-server");
    const { data } = await serviceSupabase
      .from("workspaces")
      .select("cache_enabled, cache_ttl_hours")
      .eq("id", workspaceId)
      .single();

    return {
      enabled: data?.cache_enabled ?? false,
      ttlHours: data?.cache_ttl_hours ?? 168,
    };
  } catch {
    return { enabled: false, ttlHours: 168 };
  }
}

export async function POST(req: NextRequest) {
  const rl = await rateLimitOrPass(req, "proxy");
  if (rl) return rl;

  const start = Date.now();
  const reqId = randomUUID();

  // 1. Extract sub-key
  const authHeader = req.headers.get("authorization") ?? "";
  const xApiKey = req.headers.get("x-api-key") ?? "";
  const rawKey = xApiKey || authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!rawKey || !rawKey.startsWith("zph_live_")) {
    return err(
      401,
      "Invalid or missing Zyphra API key. Keys must start with zph_live_",
    );
  }

  // 2. Resolve sub-key → workspace + Anthropic key
  let resolved;
  try {
    resolved = await resolveSubKey(rawKey);
  } catch (e) {
    return err(500, "Internal error resolving API key", "api_error");
  }
  if (!resolved)
    return err(401, "API key not found or inactive", "authentication_error");

  const {
    subKeyId,
    workspaceId,
    label,
    anthropicKey,
    monthlyBudgetUsd,
    dailyRequestLimit,
  } = resolved;

  // 3. Check budgets
  let budget;
  try {
    budget = await checkBudget(
      subKeyId,
      workspaceId,
      monthlyBudgetUsd,
      dailyRequestLimit,
    );
  } catch (e) {
    return err(500, "Internal error checking budget", "api_error");
  }

  if (!budget.allowed) {
    await logUsage({
      subKeyId,
      workspaceId,
      model: "unknown",
      inputTokens: 0,
      outputTokens: 0,
      statusCode: 429,
      durationMs: Date.now() - start,
      errorMessage: budget.reason,
    });
    return err(429, budget.reason ?? "Rate limit exceeded", "rate_limit_error");
  }

  // 4. Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err(400, "Invalid JSON body");
  }

  const model = typeof body.model === "string" ? body.model : "unknown";
  const isStream = body.stream === true;

  // ── 5. SMART MODEL ROUTING ───────────────────────────────────────────────
  // Route to cheaper models based on prompt complexity if enabled for workspace.
  // Runs before cache check so the cache lookup uses the correct routed model.
  const routingResult = await applyRouting(
    workspaceId,
    model,
    body,
    "anthropic",
  );
  const activeModel = routingResult.model; // model actually sent upstream

  // Update body.model if routing changed it
  if (routingResult.routed) {
    body.model = activeModel;
  }

  // ── 6. CACHE CHECK (non-streaming only) ──────────────────────────────────
  // Streaming responses can't be cached — the client expects a live SSE stream.
  if (!isStream) {
    const cacheConfig = await getCacheConfig(workspaceId);
    if (cacheConfig.enabled) {
      try {
        const promptHash = await buildPromptHash(body);
        const hit = await lookupCache(workspaceId, promptHash, model);

        if (hit) {
          // Cache hit — return cached response, log as cached (cost = 0)
          await logUsage({
            subKeyId,
            workspaceId,
            model,
            inputTokens: 0,
            outputTokens: 0, // cached — no tokens consumed
            statusCode: 200,
            durationMs: Date.now() - start,
            cached: true,
          });
          // Mark as cached in usage_logs (fire-and-forget update of the row we just inserted)
          // The logUsage above already wrote — we'll handle the cached flag via a separate approach

          // Fire alerts with zero additional cost
          const totalSpent = budget.monthlySpendUsd;
          fireAlerts(
            subKeyId,
            workspaceId,
            label,
            totalSpent,
            monthlyBudgetUsd,
          );

          // Return cached response with cache header for debugging
          const response = NextResponse.json(hit.responseBody, { status: 200 });
          response.headers.set("x-cache", "HIT");
          response.headers.set("x-cache-id", hit.id);
          return response;
        }
      } catch (e) {
        // Cache errors should never block the request — fall through to live API
        log.error({ err: e }, "Cache lookup error");
      }
    }
  }

  // 7. Resolve API key — try pool first, fallback to workspace key
  let activeApiKey = anthropicKey;
  let activeKeyLabel = "workspace-key";
  let activeKeyPoolId: string | null = null;

  const poolKey = await selectKeyFromPool(workspaceId, "anthropic");
  if (poolKey) {
    activeApiKey = poolKey.key;
    activeKeyLabel = poolKey.label;
    activeKeyPoolId = poolKey.keyId;
  }

  // 8. Build upstream headers
  const upstreamHeaders: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": activeApiKey,
    "anthropic-version": req.headers.get("anthropic-version") ?? "2023-06-01",
  };
  for (const h of [
    "anthropic-beta",
    "anthropic-dangerous-direct-browser-access",
  ]) {
    const v = req.headers.get(h);
    if (v) upstreamHeaders[h] = v;
  }

  // 9. Forward to upstream (with pool retry on 429)
  let upstream: Response;
  let lastError = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Re-select a different key on retry
    if (attempt > 0 && activeKeyPoolId) {
      const retryKey = await selectKeyFromPool(workspaceId, "anthropic");
      if (!retryKey || retryKey.keyId === activeKeyPoolId) break; // no more keys
      activeApiKey = retryKey.key;
      activeKeyLabel = retryKey.label;
      activeKeyPoolId = retryKey.keyId;
      upstreamHeaders["x-api-key"] = activeApiKey;
    }

    try {
      upstream = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
        method: "POST",
        headers: upstreamHeaders,
        body: JSON.stringify(body),
      });
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Unknown network error";
      continue; // network error → retry with next key
    }

    // Rate limited → mark key, retry with next
    if (isRateLimited(upstream) && activeKeyPoolId) {
      markRateLimited(activeKeyPoolId, parseRetryAfter(upstream)).catch(
        () => {},
      );
      continue; // retry loop will pick next key
    }

    break; // success or non-retryable error
  }

  // If we exhausted retries and still got nothing useful
  if (!upstream!) {
    await logUsage({
      subKeyId,
      workspaceId,
      model: activeModel,
      inputTokens: 0,
      outputTokens: 0,
      statusCode: 502,
      durationMs: Date.now() - start,
      errorMessage: lastError,
      originalModel: routingResult.routed ? routingResult.originalModel : null,
    });
    return err(502, "Failed to reach Anthropic API", "api_error");
  }

  // 10. Stream vs non-stream
  if (isStream) {
    const upstreamBody = upstream.body;
    if (!upstreamBody) return err(502, "Empty upstream response", "api_error");

    let inputTokens = 0,
      outputTokens = 0;
    const statusCode = upstream.status;

    // Increment pool key usage (fire-and-forget, non-blocking)
    if (activeKeyPoolId) incrementRequestCount(activeKeyPoolId);

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        const text = new TextDecoder().decode(chunk);
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const p = JSON.parse(line.slice(6));
            if (p.type === "message_start" && p.message?.usage)
              inputTokens = p.message.usage.input_tokens ?? 0;
            if (p.type === "message_delta" && p.usage)
              outputTokens = p.usage.output_tokens ?? 0;
          } catch {}
        }
      },
      async flush() {
        await logUsage({
          subKeyId,
          workspaceId,
          model: activeModel,
          inputTokens,
          outputTokens,
          statusCode,
          durationMs: Date.now() - start,
          originalModel: routingResult.routed
            ? routingResult.originalModel
            : null,
        });
        const totalSpent =
          budget.monthlySpendUsd +
          calculateCost(activeModel, inputTokens, outputTokens);
        fireAlerts(subKeyId, workspaceId, label, totalSpent, monthlyBudgetUsd);
      },
    });

    return new Response(upstreamBody.pipeThrough(transform), {
      status: statusCode,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive",
        "x-cache": "MISS",
        "x-routed": routingResult.routed
          ? `${routingResult.originalModel} → ${activeModel}`
          : "false",
        "x-tier": routingResult.tier,
        "x-key": activeKeyLabel,
        "x-request-id": reqId,
      },
    });
  } else {
    // ── Non-streaming: get response, log, cache ────────────────────────────
    let responseBody: Record<string, unknown>;
    try {
      responseBody = await upstream.json();
    } catch {
      return err(502, "Invalid JSON from upstream", "api_error");
    }

    const usage = responseBody.usage as
      | { input_tokens?: number; output_tokens?: number }
      | undefined;
    const inputTokens = usage?.input_tokens ?? 0;
    const outputTokens = usage?.output_tokens ?? 0;

    // Increment pool key usage (fire-and-forget)
    if (activeKeyPoolId) incrementRequestCount(activeKeyPoolId);

    logUsage({
      subKeyId,
      workspaceId,
      model: activeModel,
      inputTokens,
      outputTokens,
      statusCode: upstream.status,
      durationMs: Date.now() - start,
      originalModel: routingResult.routed ? routingResult.originalModel : null,
    }).catch((e) => log.error({ err: e }, "Usage logging failed"));

    // ── Store in cache (fire-and-forget) ──────────────────────────────────
    const cacheConfig = await getCacheConfig(workspaceId);
    if (cacheConfig.enabled && upstream.status === 200) {
      const costUsd = calculateCost(activeModel, inputTokens, outputTokens);
      buildPromptHash(body)
        .then((promptHash) => {
          storeCache({
            workspaceId,
            promptHash,
            model: activeModel,
            responseBody,
            inputTokens,
            outputTokens,
            costUsd,
            ttlHours: cacheConfig.ttlHours,
          }).catch((e) => log.error({ err: e }, "Cache store error"));
        })
        .catch(() => {});
    }

    // Fire alerts (non-blocking)
    const totalSpent =
      budget.monthlySpendUsd +
      calculateCost(activeModel, inputTokens, outputTokens);
    fireAlerts(subKeyId, workspaceId, label, totalSpent, monthlyBudgetUsd);

    const response = NextResponse.json(responseBody, {
      status: upstream.status,
    });
    response.headers.set("x-cache", "MISS");
    response.headers.set(
      "x-routed",
      routingResult.routed
        ? `${routingResult.originalModel} → ${activeModel}`
        : "false",
    );
    response.headers.set("x-tier", routingResult.tier);
    response.headers.set("x-key", activeKeyLabel);
    response.headers.set("x-request-id", reqId);
    return response;
  }
}

// Allowed origins for CORS — only the dashboard and local dev
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL ?? "https://zyphra.vercel.app",
  "http://localhost:3000",
];

function getAllowedOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return ALLOWED_ORIGINS[0]; // server-to-server (no Origin header)
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

export async function OPTIONS(req: NextRequest) {
  const allowed = getAllowedOrigin(req);
  if (!allowed) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": allowed,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers":
        "content-type, x-api-key, authorization, anthropic-version, anthropic-beta",
      "access-control-allow-credentials": "true",
      "access-control-max-age": "86400",
    },
  });
}
