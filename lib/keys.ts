import { customAlphabet } from "nanoid";
import { hashKey } from "./crypto";
import { serviceSupabase } from "./supabase-server";

const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
const nanoid = customAlphabet(alphabet, 32);

export function generateRawKey(): string {
  return `zph_live_${nanoid()}`;
}

export type CreateKeyInput = {
  workspaceId: string;
  createdBy: string;
  label: string;
  monthlyBudgetUsd?: number | null;
  dailyRequestLimit?: number | null;
};

export type SubKey = {
  id: string;
  workspace_id: string;
  label: string;
  key_prefix: string;
  monthly_budget_usd: number | null;
  daily_request_limit: number | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
};

export async function createSubKey(
  input: CreateKeyInput,
): Promise<{ raw: string; record: SubKey }> {
  const raw = generateRawKey();
  const hash = await hashKey(raw);
  const prefix = raw.slice(0, 12);

  const { data, error } = await serviceSupabase
    .from("sub_keys")
    .insert({
      workspace_id: input.workspaceId,
      created_by: input.createdBy,
      label: input.label,
      key_hash: hash,
      key_prefix: prefix,
      monthly_budget_usd: input.monthlyBudgetUsd ?? null,
      daily_request_limit: input.dailyRequestLimit ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create sub-key: ${error.message}`);
  return { raw, record: data as SubKey };
}

export type ResolvedKey = {
  subKeyId: string;
  workspaceId: string;
  label: string;
  anthropicKey: string;
  monthlyBudgetUsd: number | null;
  dailyRequestLimit: number | null;
};

export async function resolveSubKey(raw: string): Promise<ResolvedKey | null> {
  const hash = await hashKey(raw);

  const { data, error } = await serviceSupabase
    .from("sub_keys")
    .select(
      `
      id, label, workspace_id,
      monthly_budget_usd, daily_request_limit, is_active,
      workspaces ( anthropic_key_enc )
    `,
    )
    .eq("key_hash", hash)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;

  // Supabase returns joined tables as array OR object depending on version —
  // handle both safely
  const raw_ws = data.workspaces as unknown;
  const enc: string | null = Array.isArray(raw_ws)
    ? (raw_ws[0]?.anthropic_key_enc ?? null)
    : ((raw_ws as { anthropic_key_enc?: string | null } | null)
        ?.anthropic_key_enc ?? null);

  if (!enc) return null;

  const { decrypt } = await import("./crypto");
  const anthropicKey = decrypt(enc);

  // Update last_used_at — fire and forget
  serviceSupabase
    .from("sub_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return {
    subKeyId: data.id,
    workspaceId: data.workspace_id,
    label: data.label,
    anthropicKey,
    monthlyBudgetUsd: data.monthly_budget_usd,
    dailyRequestLimit: data.daily_request_limit,
  };
}

export async function listSubKeys(workspaceId: string): Promise<SubKey[]> {
  const { data, error } = await serviceSupabase
    .from("sub_keys")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as SubKey[];
}

export async function revokeSubKey(
  id: string,
  workspaceId: string,
): Promise<void> {
  const { error } = await serviceSupabase
    .from("sub_keys")
    .update({ is_active: false })
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);
}
