import { serviceSupabase } from "./supabase-server";
import { decrypt } from "./crypto";

// ── Types ────────────────────────────────────────────────────────────────────
export type PoolKey = {
  id: string;
  keyEnc: string;
  label: string;
  priority: number;
};

export type KeySelectionResult = {
  keyId: string;
  key: string; // decrypted API key
  label: string;
};

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_RETRIES = 3; // max key switches before giving up
const DEFAULT_RETRY_AFTER = 60; // seconds if no retry-after header

// ── Select the best available key from the pool ──────────────────────────────
// Uses the partial index for speed: active + not rate-limited + under daily limit.
// Returns null if pool is empty → caller falls back to workspace key.
export async function selectKeyFromPool(
  workspaceId: string,
  provider: "anthropic" | "openai",
): Promise<KeySelectionResult | null> {
  const { data: keys, error } = await serviceSupabase
    .from("api_key_pool")
    .select(
      "id, key_enc, label, priority, requests_today, daily_limit, last_reset_at",
    )
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .eq("is_active", true)
    .or(
      `rate_limited_until.is.null,rate_limited_until.lt.${new Date().toISOString()}`,
    )
    .order("priority", { ascending: true })
    .order("requests_today", { ascending: true })
    .limit(1);

  if (error || !keys || keys.length === 0) return null;

  const k = keys[0];

  // Filter in JS for daily_limit (can't do NULL-safe OR in PostgREST easily)
  if (k.daily_limit != null && k.requests_today >= k.daily_limit) return null;

  // Daily reset: if last_reset_at is before today, reset count (fire-and-forget)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (new Date(k.last_reset_at) < today) {
    serviceSupabase
      .from("api_key_pool")
      .update({ requests_today: 0, last_reset_at: today.toISOString() })
      .eq("id", k.id)
      .then(() => {});
  }

  // Decrypt the key — AES-256-GCM is ~microseconds
  const key = decrypt(k.key_enc);

  return {
    keyId: k.id,
    key,
    label: k.label,
  };
}

// ── Mark a key as rate-limited after a 429 ──────────────────────────────────
export async function markRateLimited(
  keyId: string,
  retryAfterSeconds: number,
): Promise<void> {
  const until = new Date(Date.now() + retryAfterSeconds * 1000).toISOString();
  await serviceSupabase
    .from("api_key_pool")
    .update({ rate_limited_until: until })
    .eq("id", keyId);
}

// ── Increment request count (fire-and-forget) ───────────────────────────────
// Called after every successful request through a pool key.
// Uses atomic RPC — no read-then-write race on requests_today.
// The RPC function (increment_pool_key_usage) is defined in keypool-migration.sql.
export function incrementRequestCount(keyId: string): void {
  // Supabase JS client .rpc() accepts the function name as a string
  // and passes args as the second parameter. The return type isn't in
  // generated types, so we type-assert to call it safely.
  void serviceSupabase.rpc("increment_pool_key_usage", {
    key_id_input: keyId,
  } as never);
}

// ── Parse retry-after header ────────────────────────────────────────────────
export function parseRetryAfter(response: Response): number {
  const header = response.headers.get("retry-after");
  if (!header) return DEFAULT_RETRY_AFTER;
  const seconds = parseInt(header, 10);
  return isNaN(seconds) ? DEFAULT_RETRY_AFTER : Math.min(seconds, 300); // cap at 5 min
}

// ── Check if response is rate-limited ───────────────────────────────────────
export function isRateLimited(response: Response): boolean {
  return response.status === 429;
}

export { MAX_RETRIES };
