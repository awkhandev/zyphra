import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, serviceSupabase } from "@/lib/supabase-server";
import {
  getWorkspaceUsageSummary,
  getWorkspaceTotalUsage,
  PRICING_LAST_VERIFIED,
} from "@/lib/usage";
import { createLogger } from "@/lib/logger";

const log = createLogger("usage");

export const dynamic = "force-dynamic";

// ── GET /api/usage?workspaceId=<id> ───────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
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

    // Use serviceSupabase to bypass RLS for membership check
    const { data: workspace } = await serviceSupabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    const isOwner = workspace?.owner_id === user.id;

    if (!isOwner) {
      // Check if member
      const { data: member } = await serviceSupabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single();

      if (!member)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [summary, workspaceTotal] = await Promise.all([
      getWorkspaceUsageSummary(workspaceId),
      getWorkspaceTotalUsage(workspaceId),
    ]);

    const totals = summary.reduce(
      (acc, k) => ({
        totalRequests: acc.totalRequests + k.request_count,
        totalTokens: acc.totalTokens + k.total_tokens,
        totalCostUsd: acc.totalCostUsd + k.cost_usd,
        dailyRequests: acc.dailyRequests + k.daily_requests,
      }),
      { totalRequests: 0, totalTokens: 0, totalCostUsd: 0, dailyRequests: 0 },
    );

    return NextResponse.json({
      summary,
      totals,
      workspaceTotal,
      pricingLastVerified: PRICING_LAST_VERIFIED,
    });
  } catch (e) {
    log.error({ err: e }, "Usage fetch failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
