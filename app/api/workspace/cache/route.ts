import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, serviceSupabase } from "@/lib/supabase-server";
import { validateBody, CacheUpdateSchema } from "@/lib/validation";
import { rateLimitOrPass } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const log = createLogger("workspace-cache");

export const dynamic = "force-dynamic";

// ── GET /api/workspace/cache ──────────────────────────────────────────────────
// Returns current cache config for the workspace
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
      .select("cache_enabled, cache_ttl_hours")
      .eq("id", workspaceId)
      .single();

    return NextResponse.json({
      cacheEnabled: ws?.cache_enabled ?? true,
      cacheTtlHours: ws?.cache_ttl_hours ?? 168,
    });
  } catch (e) {
    log.error({ err: e }, "Failed to get cache config");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── PUT /api/workspace/cache ──────────────────────────────────────────────────
// Update cache settings (enable/disable, TTL)
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

    const parsed = await validateBody(req, CacheUpdateSchema);
    if ("error" in parsed) return parsed.error;

    const { workspaceId, cacheEnabled, cacheTtlHours } = parsed.data;

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
    if (cacheEnabled !== undefined) updates.cache_enabled = cacheEnabled;
    if (cacheTtlHours !== undefined) {
      // Clamp TTL to 1-720 hours (1 min to 30 days)
      updates.cache_ttl_hours = Math.max(
        1,
        Math.min(720, Math.round(cacheTtlHours)),
      );
    }

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
      log.error({ err: error }, "Failed to update cache config");
      return NextResponse.json(
        { error: "Failed to update cache settings" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    log.error({ err: e }, "Cache update failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
