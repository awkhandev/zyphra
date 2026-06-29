import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, serviceSupabase } from "@/lib/supabase-server";
import { validateBody, RoutingUpdateSchema } from "@/lib/validation";
import { rateLimitOrPass } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const log = createLogger("routing");

export const dynamic = "force-dynamic";

// ── GET /api/workspace/routing ───────────────────────────────────────────────
// Returns current routing config for the workspace
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

    // Verify user is owner or admin
    const { data: workspace } = await serviceSupabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    if (workspace?.owner_id !== user.id) {
      const { data: member } = await serviceSupabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single();

      if (!member || !["owner", "admin"].includes(member.role)) {
        return NextResponse.json({ error: "Admins only" }, { status: 403 });
      }
    }

    const { data: ws } = await serviceSupabase
      .from("workspaces")
      .select("routing_enabled, routing_config, routing_config_openai")
      .eq("id", workspaceId)
      .single();

    return NextResponse.json({
      routingEnabled: ws?.routing_enabled ?? false,
      routingConfig: ws?.routing_config ?? {
        simple: "claude-haiku-4-5-20251001",
        medium: "claude-sonnet-4-6",
        complex: "passthrough",
      },
      routingConfigOpenai: ws?.routing_config_openai ?? {
        simple: "gpt-4o-mini",
        medium: "gpt-4o",
        complex: "passthrough",
      },
    });
  } catch (e) {
    log.error({ err: e }, "Failed to get routing config");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── PUT /api/workspace/routing ───────────────────────────────────────────────
// Update routing settings
export async function PUT(req: NextRequest) {
  const rl = await rateLimitOrPass(req, "general");
  if (rl) return rl;

  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = await validateBody(req, RoutingUpdateSchema);
    if ("error" in parsed) return parsed.error;

    const { workspaceId, routingEnabled, routingConfig, routingConfigOpenai } =
      parsed.data;

    // Verify user is owner or admin
    const { data: workspace } = await serviceSupabase
      .from("workspaces")
      .select("owner_id")
      .eq("id", workspaceId)
      .single();

    if (workspace?.owner_id !== user.id) {
      const { data: member } = await serviceSupabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .single();

      if (!member || !["owner", "admin"].includes(member.role)) {
        return NextResponse.json({ error: "Admins only" }, { status: 403 });
      }
    }

    const updates: Record<string, unknown> = {};
    if (routingEnabled !== undefined) updates.routing_enabled = routingEnabled;
    if (routingConfig !== undefined) updates.routing_config = routingConfig;
    if (routingConfigOpenai !== undefined)
      updates.routing_config_openai = routingConfigOpenai;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const { error } = await serviceSupabase
      .from("workspaces")
      .update(updates)
      .eq("id", workspaceId);

    if (error) {
      log.error({ err: error }, "Failed to update routing config");
      return NextResponse.json(
        { error: "Failed to update routing settings" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    log.error({ err: e }, "Routing update failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
