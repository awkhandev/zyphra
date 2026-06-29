import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, serviceSupabase } from "@/lib/supabase-server";
import { createSubKey, listSubKeys, revokeSubKey } from "@/lib/keys";
import { getMaxKeys } from "@/lib/payments";
import { rateLimitOrPass } from "@/lib/rate-limit";
import { validateBody, KeyCreateSchema } from "@/lib/validation";
import { createLogger } from "@/lib/logger";

const log = createLogger("keys");

export const dynamic = "force-dynamic";

async function authorizeAdmin(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const { data: workspace } = await serviceSupabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();
  if (workspace?.owner_id === userId) return true;

  const { data: member } = await serviceSupabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();
  return !!member && ["owner", "admin"].includes(member.role);
}

async function authorizeMember(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const { data: workspace } = await serviceSupabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();
  if (workspace?.owner_id === userId) return true;

  const { data: member } = await serviceSupabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();
  return !!member;
}

// ── GET /api/keys ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId)
    return NextResponse.json(
      { error: "workspaceId required" },
      { status: 400 },
    );

  if (!(await authorizeMember(workspaceId, user.id)))
    return NextResponse.json({ error: "Not a member" }, { status: 403 });

  try {
    const keys = await listSubKeys(workspaceId);
    return NextResponse.json({ keys });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch keys" },
      { status: 500 },
    );
  }
}

// ── POST /api/keys ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const rl = await rateLimitOrPass(req, "keys");
  if (rl) return rl;

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, KeyCreateSchema);
  if ("error" in parsed) return parsed.error;

  const { workspaceId, label, monthlyBudgetUsd, dailyRequestLimit } =
    parsed.data;

  if (!(await authorizeAdmin(workspaceId, user.id)))
    return NextResponse.json(
      { error: "Only admins can create keys" },
      { status: 403 },
    );

  // ── Plan limit enforcement ────────────────────────────────────────────────
  const { data: workspace } = await serviceSupabase
    .from("workspaces")
    .select("plan, monthly_budget_usd")
    .eq("id", workspaceId)
    .single();

  const currentPlan = workspace?.plan ?? "free";
  const maxKeys = getMaxKeys(currentPlan);

  const { count } = await serviceSupabase
    .from("sub_keys")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("is_active", true);

  const activeKeys = count ?? 0;

  if (activeKeys >= maxKeys) {
    const planName = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
    return NextResponse.json(
      {
        error: `Key limit reached`,
        detail: `Your ${planName} plan allows ${maxKeys} active keys. You have ${activeKeys}.`,
        upgradeNeeded: true,
        currentPlan,
        maxKeys,
        activeKeys,
      },
      { status: 403 },
    );
  }

  // ── Sub-key budget validation ─────────────────────────────────────────────
  // Prevent sub-key budgets from exceeding workspace-level budget
  if (workspace?.monthly_budget_usd != null && monthlyBudgetUsd != null) {
    if (monthlyBudgetUsd > workspace.monthly_budget_usd) {
      return NextResponse.json(
        {
          error: "Sub-key budget exceeds workspace budget",
          detail: `Workspace budget is $${workspace.monthly_budget_usd}/month. Sub-key budget of $${monthlyBudgetUsd} cannot exceed this.`,
        },
        { status: 400 },
      );
    }

    // Aggregate check: sum of all active sub-key budgets + new key shouldn't exceed workspace budget
    const { data: existingKeys } = await serviceSupabase
      .from("sub_keys")
      .select("monthly_budget_usd")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    const totalExistingBudget = (existingKeys ?? []).reduce(
      (sum, k) => sum + (k.monthly_budget_usd ?? 0),
      0,
    );

    if (totalExistingBudget + monthlyBudgetUsd > workspace.monthly_budget_usd) {
      return NextResponse.json(
        {
          error: "Aggregate sub-key budgets would exceed workspace budget",
          detail: `Existing sub-key budgets total $${totalExistingBudget}/month. Adding $${monthlyBudgetUsd} would exceed the workspace limit of $${workspace.monthly_budget_usd}/month.`,
          totalExistingBudget,
          newKeyBudget: monthlyBudgetUsd,
          workspaceBudget: workspace.monthly_budget_usd,
        },
        { status: 400 },
      );
    }
  }

  try {
    const { raw, record } = await createSubKey({
      workspaceId,
      createdBy: user.id,
      label: label.trim(),
      monthlyBudgetUsd: monthlyBudgetUsd ?? null,
      dailyRequestLimit: dailyRequestLimit ?? null,
    });
    return NextResponse.json({ key: raw, record }, { status: 201 });
  } catch (e) {
    log.error({ err: e }, "Key creation failed");
    return NextResponse.json(
      { error: "Failed to create key" },
      { status: 500 },
    );
  }
}

// ── DELETE /api/keys ──────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const rl = await rateLimitOrPass(req, "keys");
  if (rl) return rl;

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!id || !workspaceId)
    return NextResponse.json(
      { error: "id and workspaceId required" },
      { status: 400 },
    );

  if (!(await authorizeAdmin(workspaceId, user.id)))
    return NextResponse.json(
      { error: "Only admins can revoke keys" },
      { status: 403 },
    );

  try {
    await revokeSubKey(id, workspaceId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to revoke key" },
      { status: 500 },
    );
  }
}
