import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { resolveSubKey } from "@/lib/keys";
import { checkBudget, logUsage, calculateCost } from "@/lib/usage";
import { buildPromptHash, lookupCache, storeCache } from "@/lib/cache";
import { serviceSupabase } from "@/lib/supabase-server";
import { decrypt } from "@/lib/crypto";
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

const log = createLogger("openai-proxy");

const OPENAI_BASE = "https://api.openai.com";

function err(status: number, message: string) {
  return NextResponse.json(
    { error: { message, type: "invalid_request_error" } },
    { status },
  );
}

// Resolve the workspace's OpenAI key from a sub-key
async function resolveOpenAIKey(
  subKeyHash: string,
  workspaceId: string,
): Promise<string | null> {
  const { data } = await serviceSupabase
    .from("workspaces")
    .select("openai_key_enc")
    .eq("id", workspaceId)
    .single();

  if (!data?.openai_key_enc) return null;
  return decrypt(data.openai_key_enc);
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

  // 1. Extract sub-key (same format as Anthropic proxy — zph_live_xxx)
  const authHeader = req.headers.get("authorization") ?? "";
  const rawKey = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!rawKey || !rawKey.startsWith("zph_live_")) {
    return err(
      401,
      "Invalid or missing Zyphra API key. Keys must start with zph_live_",
    );
  }

  // 2. Resolve sub-key
  const resolved = await resolveSubKey(rawKey).catch(() => null);
  if (!resolved) return err(401, "API key not found or inactive");

  const { subKeyId, workspaceId, label, monthlyBudgetUsd, dailyRequestLimit } =
    resolved;

  // 3. Resolve OpenAI key — try pool first, fall back to workspace key
  let openaiKey: string | null = null;
  let openaiKeyLabel = "workspace-key";
  let openaiKeyPoolId: string | null = null;

  const poolKey = await selectKeyFromPool(workspaceId, "openai");
  if (poolKey) {
    openaiKey = poolKey.key;
    openaiKeyLabel = poolKey.label;
    openaiKeyPoolId = poolKey.keyId;
  } else {
    openaiKey = await resolveOpenAIKey(rawKey, workspaceId);
  }

  if (!openaiKey) {
    return err(
      400,
      "No OpenAI API key configured for this workspace. " +
        "Go to your Zyphra dashboard → Settings to add one, " +
        "or add keys to the key pool for load balancing.",
    );
  }

  // 4. Check budget
  const budget = await checkBudget(
    subKeyId,
    workspaceId,
    monthlyBudgetUsd,
    dailyRequestLimit,
  ).catch(() => ({
    allowed: false,
    reason: "Budget check failed",
    monthlySpendUsd: 0,
    dailyRequests: 0,
  }));

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
    return err(429, budget.reason ?? "Budget exceeded");
  }

  // 5. Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err(400, "Invalid JSON body");
  }

  const model = typeof body.model === "string" ? body.model : "gpt-4o";
  const isStream = body.stream === true;

  // ── 5b. SMART MODEL ROUTING ─────────────────────────────────────────────
  const routingResult = await applyRouting(workspaceId, model, body, "openai");
  const activeModel = routingResult.model;
  if (routingResult.routed) {
    body.model = activeModel;
  }

  // ── 5c. CACHE CHECK (non-streaming only) ────────────────────────────────
  if (!isStream) {
    const cacheConfig = await getCacheConfig(workspaceId);
    if (cacheConfig.enabled) {
      try {
        const promptHash = await buildPromptHash(body);
        const hit = await lookupCache(workspaceId, promptHash, model);

        if (hit) {
          await logUsage({
            subKeyId,
            workspaceId,
            model,
            inputTokens: 0,
            outputTokens: 0,
            statusCode: 200,
            durationMs: Date.now() - start,
            cached: true,
          });

          const totalSpent = budget.monthlySpendUsd;
          fireAlerts(
            subKeyId,
            workspaceId,
            label,
            totalSpent,
            monthlyBudgetUsd,
          );

          const response = NextResponse.json(hit.responseBody, { status: 200 });
          response.headers.set("x-cache", "HIT");
          response.headers.set("x-cache-id", hit.id);
          return response;
        }
      } catch (e) {
        log.error({ err: e }, "Cache lookup error");
      }
    }
  }

  // For streaming: inject stream_options to get usage data in the final chunk
  const upstreamBody = isStream
    ? { ...body, stream_options: { include_usage: true } }
    : body;

  // 6. Forward to OpenAI (with pool retry on 429)
  let upstream: Response;
  let lastError = "";
  const bodyStr = JSON.stringify(upstreamBody);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Re-select a different key on retry
    if (attempt > 0 && openaiKeyPoolId) {
      const retryKey = await selectKeyFromPool(workspaceId, "openai");
      if (!retryKey || retryKey.keyId === openaiKeyPoolId) break;
      openaiKey = retryKey.key;
      openaiKeyLabel = retryKey.label;
      openaiKeyPoolId = retryKey.keyId;
    }

    try {
      upstream = await fetch(`${OPENAI_BASE}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${openaiKey}`,
        },
        body: bodyStr,
      });
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Network error";
      continue;
    }

    if (isRateLimited(upstream) && openaiKeyPoolId) {
      markRateLimited(openaiKeyPoolId, parseRetryAfter(upstream)).catch(
        () => {},
      );
      continue;
    }

    break;
  }

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
    return err(502, "Failed to reach OpenAI API");
  }

  // 7. Stream vs non-stream
  if (isStream) {
    const body = upstream.body;
    if (!body) return err(502, "Empty upstream response");

    let inputTokens = 0,
      outputTokens = 0;
    const statusCode = upstream.status;

    if (openaiKeyPoolId) incrementRequestCount(openaiKeyPoolId);

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        const text = new TextDecoder().decode(chunk);
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          try {
            const p = JSON.parse(line.slice(6));
            if (p.usage) {
              inputTokens = p.usage.prompt_tokens ?? inputTokens;
              outputTokens = p.usage.completion_tokens ?? outputTokens;
            }
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
        const spent =
          budget.monthlySpendUsd +
          calculateCost(activeModel, inputTokens, outputTokens);
        fireAlerts(subKeyId, workspaceId, label, spent, monthlyBudgetUsd);
      },
    });

    return new Response(body.pipeThrough(transform), {
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
        "x-key": openaiKeyLabel,
        "x-request-id": reqId,
      },
    });
  } else {
    // ── Non-streaming: get response, log, cache ────────────────────────────
    let responseBody: Record<string, unknown>;
    try {
      responseBody = await upstream.json();
    } catch {
      return err(502, "Invalid JSON from OpenAI");
    }

    const usage = responseBody.usage as
      | { prompt_tokens?: number; completion_tokens?: number }
      | undefined;
    const inputTokens = usage?.prompt_tokens ?? 0;
    const outputTokens = usage?.completion_tokens ?? 0;

    if (openaiKeyPoolId) incrementRequestCount(openaiKeyPoolId);

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

    const spent =
      budget.monthlySpendUsd +
      calculateCost(activeModel, inputTokens, outputTokens);
    fireAlerts(subKeyId, workspaceId, label, spent, monthlyBudgetUsd);

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
    response.headers.set("x-key", openaiKeyLabel);
    response.headers.set("x-request-id", reqId);
    return response;
  }
}

// CORS preflight
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
      "access-control-allow-headers": "content-type, authorization",
      "access-control-allow-credentials": "true",
      "access-control-max-age": "86400",
    },
  });
}
