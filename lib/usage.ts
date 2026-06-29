import { serviceSupabase } from "./supabase-server";
import { createLogger } from "./logger";

const log = createLogger("usage");

// ── Pricing table (per 1M tokens, USD) ───────────────────────────────────────
// Last verified: 2026-06-28 against Anthropic & OpenAI published rates.
// These are ESTIMATES — actual provider bills may differ due to:
// - Batch API discounts
// - Prompt caching (Anthropic)
// - Volume discounts
// - Model-specific pricing changes
export const PRICING_LAST_VERIFIED = "2026-06-28";

const PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic Claude
  "claude-opus-4-8": { input: 15.0, output: 75.0 },
  "claude-opus-4-7": { input: 15.0, output: 75.0 },
  "claude-opus-4-6": { input: 15.0, output: 75.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
  // OpenAI GPT
  "gpt-4o": { input: 5.0, output: 15.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  "gpt-4": { input: 30.0, output: 60.0 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  o1: { input: 15.0, output: 60.0 },
  "o1-mini": { input: 3.0, output: 12.0 },
  "o3-mini": { input: 1.1, output: 4.4 },
  "o4-mini": { input: 1.1, output: 4.4 },
  // Fallback for unknown models
  default: { input: 3.0, output: 15.0 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = PRICING[model] ?? PRICING["default"];
  return (
    (inputTokens / 1_000_000) * rate.input +
    (outputTokens / 1_000_000) * rate.output
  );
}

// ── Budget enforcement ────────────────────────────────────────────────────────
export type BudgetStatus = {
  allowed: boolean;
  reason?: string;
  monthlySpendUsd: number;
  dailyRequests: number;
};

export async function checkBudget(
  subKeyId: string,
  workspaceId: string,
  monthlyBudgetUsd: number | null,
  dailyRequestLimit: number | null,
): Promise<BudgetStatus> {
  const [monthlyRes, dailyRes] = await Promise.all([
    serviceSupabase
      .from("v_monthly_spend")
      .select("cost_usd")
      .eq("sub_key_id", subKeyId)
      .single(),
    serviceSupabase
      .from("v_daily_requests")
      .select("request_count")
      .eq("sub_key_id", subKeyId)
      .single(),
  ]);

  const monthlySpendUsd = parseFloat(monthlyRes.data?.cost_usd ?? "0");
  const dailyRequests = parseInt(dailyRes.data?.request_count ?? "0", 10);

  if (monthlyBudgetUsd !== null && monthlySpendUsd >= monthlyBudgetUsd) {
    return {
      allowed: false,
      reason: `Monthly budget of $${monthlyBudgetUsd.toFixed(2)} exceeded (used $${monthlySpendUsd.toFixed(4)})`,
      monthlySpendUsd,
      dailyRequests,
    };
  }
  if (dailyRequestLimit !== null && dailyRequests >= dailyRequestLimit) {
    return {
      allowed: false,
      reason: `Daily request limit of ${dailyRequestLimit} exceeded (used ${dailyRequests})`,
      monthlySpendUsd,
      dailyRequests,
    };
  }
  return { allowed: true, monthlySpendUsd, dailyRequests };
}

// ── Usage logging ─────────────────────────────────────────────────────────────
export type LogUsageInput = {
  subKeyId: string;
  workspaceId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  statusCode: number;
  durationMs: number;
  errorMessage?: string;
  originalModel?: string | null; // set when smart routing swaps the model
  cached?: boolean; // true when response served from cache
};

export async function logUsage(input: LogUsageInput): Promise<void> {
  const costUsd = calculateCost(
    input.model,
    input.inputTokens,
    input.outputTokens,
  );

  // Build insert payload — include `cached` field if column exists in schema
  const payload: Record<string, unknown> = {
    sub_key_id: input.subKeyId,
    workspace_id: input.workspaceId,
    model: input.model,
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    cost_usd: costUsd,
    status_code: input.statusCode,
    duration_ms: input.durationMs,
    error_message: input.errorMessage ?? null,
    original_model: input.originalModel ?? null,
  };

  // Include cached flag — if column doesn't exist yet, Supabase will error
  // and we'll retry without it so usage logging never breaks
  let { error } = await serviceSupabase.from("usage_logs").insert({
    ...payload,
    cached: input.cached ?? false,
  });

  if (error?.message?.includes("cached") || error?.code === "42703") {
    // Column doesn't exist yet — log without cached field
    const { error: retryError } = await serviceSupabase
      .from("usage_logs")
      .insert(payload);
    if (retryError)
      log.error(
        { err: retryError, subKeyId: input.subKeyId, model: input.model },
        "Failed to log usage",
      );
  } else if (error) {
    log.error(
      { err: error, subKeyId: input.subKeyId, model: input.model },
      "Failed to log usage",
    );
  }
}

// ── Dashboard summary ─────────────────────────────────────────────────────────
export type KeyUsageSummary = {
  sub_key_id: string;
  label: string;
  key_prefix: string;
  monthly_budget_usd: number | null;
  is_active: boolean;
  request_count: number;
  total_tokens: number;
  cost_usd: number;
  daily_requests: number;
  last_used_at: string | null;
};

export async function getWorkspaceUsageSummary(
  workspaceId: string,
): Promise<KeyUsageSummary[]> {
  const [keysRes, monthlyRes, dailyRes] = await Promise.all([
    serviceSupabase
      .from("sub_keys")
      .select(
        "id, label, key_prefix, monthly_budget_usd, is_active, last_used_at",
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    serviceSupabase
      .from("v_monthly_spend")
      .select("sub_key_id, request_count, total_tokens, cost_usd")
      .eq("workspace_id", workspaceId),
    serviceSupabase
      .from("v_daily_requests")
      .select("sub_key_id, request_count")
      .eq("workspace_id", workspaceId),
  ]);

  const keys = keysRes.data ?? [];
  const monthly = monthlyRes.data ?? [];
  const daily = dailyRes.data ?? [];

  return keys.map((k) => {
    const m = monthly.find((r) => r.sub_key_id === k.id);
    const d = daily.find((r) => r.sub_key_id === k.id);
    return {
      sub_key_id: k.id,
      label: k.label,
      key_prefix: k.key_prefix,
      monthly_budget_usd: k.monthly_budget_usd,
      is_active: k.is_active,
      request_count: parseInt(m?.request_count ?? "0", 10),
      total_tokens: parseInt(m?.total_tokens ?? "0", 10),
      cost_usd: parseFloat(m?.cost_usd ?? "0"),
      daily_requests: parseInt(d?.request_count ?? "0", 10),
      last_used_at: k.last_used_at,
    };
  });
}

// ── Workspace-level total usage ───────────────────────────────────────────────
export type WorkspaceTotalUsage = {
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  cachedRequests: number;
  liveRequests: number;
};

export async function getWorkspaceTotalUsage(
  workspaceId: string,
): Promise<WorkspaceTotalUsage> {
  const monthlyRes = await serviceSupabase
    .from("v_monthly_spend")
    .select("request_count, total_tokens, cost_usd")
    .eq("workspace_id", workspaceId);

  const monthly = monthlyRes.data ?? [];
  const totalRequests = monthly.reduce(
    (sum, r) => sum + parseInt(r.request_count ?? "0", 10),
    0,
  );
  const totalTokens = monthly.reduce(
    (sum, r) => sum + parseInt(r.total_tokens ?? "0", 10),
    0,
  );
  const totalCostUsd = monthly.reduce(
    (sum, r) => sum + parseFloat(r.cost_usd ?? "0"),
    0,
  );

  // Query cached request count — graceful fallback if `cached` column doesn't exist yet
  let cachedRequests = 0;
  const cachedRes = await serviceSupabase
    .from("usage_logs")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("cached", true)
    .gte("created_at", new Date(new Date().setDate(1)).toISOString());

  if (
    cachedRes.error &&
    (cachedRes.error.message?.includes("cached") ||
      cachedRes.error.code === "42703")
  ) {
    // Column doesn't exist yet — report 0 cached, all treated as live
    cachedRequests = 0;
  } else {
    cachedRequests = cachedRes.count ?? 0;
  }

  return {
    totalRequests,
    totalTokens,
    totalCostUsd,
    cachedRequests,
    liveRequests: totalRequests - cachedRequests,
  };
}
