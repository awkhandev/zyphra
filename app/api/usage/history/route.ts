import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, serviceSupabase } from "@/lib/supabase-server";
import { createLogger } from "@/lib/logger";

const log = createLogger("usage");

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    const subKeyId = req.nextUrl.searchParams.get("subKeyId"); // optional filter
    if (!workspaceId)
      return NextResponse.json(
        { error: "workspaceId required" },
        { status: 400 },
      );

    // Verify membership
    const { data: ws } = await serviceSupabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();
    if (ws?.owner_id !== user.id) {
      const { data: m } = await serviceSupabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single();
      if (!m) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build query — daily aggregates for last 30 days
    let query = serviceSupabase
      .from("usage_logs")
      .select("created_at, input_tokens, output_tokens, cost_usd, status_code")
      .eq("workspace_id", workspaceId)
      .eq("status_code", 200)
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      );

    if (subKeyId) query = query.eq("sub_key_id", subKeyId);

    const { data: rows, error } = await query;
    if (error) {
      log.error({ err: error }, "Failed to fetch usage history");
      return NextResponse.json(
        { error: "Failed to fetch usage history" },
        { status: 500 },
      );
    }

    // Aggregate by day client-side (avoids needing pg functions)
    const byDay: Record<
      string,
      { requests: number; tokens: number; cost: number }
    > = {};

    // Pre-fill last 30 days with zeros so chart always shows full range
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      byDay[key] = { requests: 0, tokens: 0, cost: 0 };
    }

    for (const row of rows ?? []) {
      const day = row.created_at.slice(0, 10);
      if (!byDay[day]) continue;
      byDay[day].requests += 1;
      byDay[day].tokens += (row.input_tokens ?? 0) + (row.output_tokens ?? 0);
      byDay[day].cost += parseFloat(row.cost_usd ?? "0");
    }

    const history = Object.entries(byDay).map(([date, v]) => ({ date, ...v }));

    return NextResponse.json({ history });
  } catch (e) {
    log.error({ err: e }, "Usage history failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
