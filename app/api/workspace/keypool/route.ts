import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, serviceSupabase } from "@/lib/supabase-server";
import { encrypt } from "@/lib/crypto";
import { rateLimitOrPass } from "@/lib/rate-limit";
import { validateBody, KeyPoolAddSchema } from "@/lib/validation";
import { createLogger } from "@/lib/logger";

const log = createLogger("keypool");

export const dynamic = "force-dynamic";

// ── GET /api/workspace/keypool ───────────────────────────────────────────────
// List all keys in the pool for a workspace. Never returns key_enc.
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

    // Verify membership
    const { data: member } = await serviceSupabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!member)
      return NextResponse.json({ error: "Not a member" }, { status: 403 });

    const { data: keys, error } = await serviceSupabase
      .from("api_key_pool")
      .select(
        "id, workspace_id, provider, label, priority, is_active, requests_today, daily_limit, rate_limited_until, last_used_at, created_at",
      )
      .eq("workspace_id", workspaceId)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      log.error({ err: error }, "Failed to list keypool");
      return NextResponse.json(
        { error: "Failed to fetch key pool" },
        { status: 500 },
      );
    }

    return NextResponse.json({ keys: keys ?? [] });
  } catch (e) {
    log.error({ err: e }, "Keypool list failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── POST /api/workspace/keypool ──────────────────────────────────────────────
// Add a key to the pool
export async function POST(req: NextRequest) {
  const rl = await rateLimitOrPass(req, "keys");
  if (rl) return rl;

  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = await validateBody(req, KeyPoolAddSchema);
    if ("error" in parsed) return parsed.error;

    const { workspaceId, provider, apiKey, label, priority, dailyLimit } =
      parsed.data;

    // Verify admin access
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

    // Encrypt the API key before storage
    const keyEnc = encrypt(apiKey);

    const { data, error } = await serviceSupabase
      .from("api_key_pool")
      .insert({
        workspace_id: workspaceId,
        provider,
        key_enc: keyEnc,
        label,
        priority: priority ?? 0,
        daily_limit: dailyLimit ?? null,
      })
      .select(
        "id, workspace_id, provider, label, priority, is_active, requests_today, daily_limit, created_at",
      )
      .single();

    if (error) {
      log.error({ err: error }, "Failed to add keypool entry");
      return NextResponse.json(
        { error: "Failed to add key to pool" },
        { status: 500 },
      );
    }

    return NextResponse.json({ key: data });
  } catch (e) {
    log.error({ err: e }, "Keypool add failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ── DELETE /api/workspace/keypool?id=xxx&workspaceId=xxx ─────────────────────
// Remove a key from the pool
export async function DELETE(req: NextRequest) {
  const rl = await rateLimitOrPass(req, "keys");
  if (rl) return rl;

  try {
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

    // Verify admin access
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

    const { error } = await serviceSupabase
      .from("api_key_pool")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error) {
      log.error({ err: error }, "Failed to delete keypool entry");
      return NextResponse.json(
        { error: "Failed to remove key from pool" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    log.error({ err: e }, "Keypool delete failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
