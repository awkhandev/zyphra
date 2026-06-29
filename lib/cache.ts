import { serviceSupabase } from "./supabase-server";
import { createLogger } from "./logger";

const log = createLogger("cache");

// ── Prompt Normalization & Hashing ─────────────────────────────────────────────
// Normalize the request body to produce a deterministic hash.
// We extract messages content and model, ignoring metadata like temperature,
// stream flag, max_tokens — these don't change the core response meaning.
function normalizePrompt(body: Record<string, unknown>): string {
  const messages = (body.messages ?? []) as Array<{
    role?: string;
    content?: unknown;
  }>;
  const model = typeof body.model === "string" ? body.model : "";

  // Flatten message content to a string — handles both string and array content
  const parts: string[] = [];
  for (const msg of messages) {
    const role = msg.role ?? "";
    const content =
      typeof msg.content === "string"
        ? msg.content
        : Array.isArray(msg.content)
          ? msg.content
              .filter(
                (b: Record<string, unknown>) => typeof b.text === "string",
              )
              .map((b: Record<string, unknown>) => b.text as string)
              .join("")
          : "";
    parts.push(`${role}:${content}`);
  }

  return `${model}|${parts.join("\n")}`;
}

async function hashPrompt(normalized: string): Promise<string> {
  const data = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(hash).toString("hex");
}

export async function buildPromptHash(
  body: Record<string, unknown>,
): Promise<string> {
  return hashPrompt(normalizePrompt(body));
}

// ── Cache Lookup ──────────────────────────────────────────────────────────────
export type CacheHit = {
  id: string;
  responseBody: Record<string, unknown>;
  inputTokens: number;
  outputTokens: number;
};

export async function lookupCache(
  workspaceId: string,
  promptHash: string,
  model: string,
): Promise<CacheHit | null> {
  const { data, error } = await serviceSupabase
    .from("prompt_cache")
    .select("id, response_body, input_tokens, output_tokens, hit_count")
    .eq("workspace_id", workspaceId)
    .eq("prompt_hash", promptHash)
    .eq("model", model)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (error || !data) return null;

  // Increment hit_count and last_hit_at — fire and forget (no blocking)
  const currentHits = typeof data.hit_count === "number" ? data.hit_count : 0;
  serviceSupabase
    .from("prompt_cache")
    .update({
      hit_count: currentHits + 1,
      last_hit_at: new Date().toISOString(),
    })
    .eq("id", data.id)
    .then(() => {});

  return {
    id: data.id,
    responseBody: data.response_body as Record<string, unknown>,
    inputTokens: data.input_tokens,
    outputTokens: data.output_tokens,
  };
}

// ── Cache Storage ─────────────────────────────────────────────────────────────
export async function storeCache(opts: {
  workspaceId: string;
  promptHash: string;
  model: string;
  responseBody: Record<string, unknown>;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  ttlHours: number;
}): Promise<void> {
  const expiresAt = new Date(
    Date.now() + opts.ttlHours * 3600_000,
  ).toISOString();

  // Upsert — if same hash+model exists, replace it
  const { error } = await serviceSupabase.from("prompt_cache").upsert(
    {
      workspace_id: opts.workspaceId,
      prompt_hash: opts.promptHash,
      model: opts.model,
      response_body: opts.responseBody,
      input_tokens: opts.inputTokens,
      output_tokens: opts.outputTokens,
      cost_usd: opts.costUsd,
      hit_count: 0,
      expires_at: expiresAt,
    },
    {
      onConflict: "workspace_id,prompt_hash,model",
      ignoreDuplicates: false,
    },
  );

  if (error)
    log.error(
      { err: error, workspaceId: opts.workspaceId },
      "Cache store failed",
    );
}

// ── Cache Stats ───────────────────────────────────────────────────────────────
export type CacheStats = {
  totalEntries: number;
  totalHits: number;
  tokensSaved: number;
  costSavedUsd: number;
  lastHitAt: string | null;
};

export async function getCacheStats(workspaceId: string): Promise<CacheStats> {
  const { data, error } = await serviceSupabase
    .from("v_cache_stats")
    .select(
      "total_entries, total_hits, tokens_saved, cost_saved_usd, last_hit_at",
    )
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !data) {
    return {
      totalEntries: 0,
      totalHits: 0,
      tokensSaved: 0,
      costSavedUsd: 0,
      lastHitAt: null,
    };
  }

  return {
    totalEntries: Number(data.total_entries) ?? 0,
    totalHits: Number(data.total_hits) ?? 0,
    tokensSaved: Number(data.tokens_saved) ?? 0,
    costSavedUsd: Number(data.cost_saved_usd) ?? 0,
    lastHitAt: data.last_hit_at as string | null,
  };
}

// ── Cleanup Expired Entries ───────────────────────────────────────────────────
// Call this periodically (e.g., daily via Supabase cron or API trigger).
export async function cleanupExpiredCache(): Promise<number> {
  const { data, error } = await serviceSupabase.rpc("cleanup_expired_cache");

  if (error) {
    log.error({ err: error }, "Cache cleanup failed");
    return 0;
  }

  return Number(data) ?? 0;
}
