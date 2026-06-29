import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, serviceSupabase } from "@/lib/supabase-server";
import { rateLimitOrPass } from "@/lib/rate-limit";
import { validateBody, InviteAcceptSchema } from "@/lib/validation";
import { createLogger } from "@/lib/logger";

const log = createLogger("invites");

export const dynamic = "force-dynamic";

// ── GET /api/invites/accept?token=<token> — fetch invite details (public) ─────
export async function GET(req: NextRequest) {
  const rl = await rateLimitOrPass(req, "invites");
  if (rl) return rl;

  const token = req.nextUrl.searchParams.get("token");
  if (!token)
    return NextResponse.json({ error: "Token required" }, { status: 400 });

  const { data: invite, error } = await serviceSupabase
    .from("workspace_invites")
    .select(
      `
      id, email, role, accepted_at, expires_at,
      workspaces ( name ),
      invited_by
    `,
    )
    .eq("token", token)
    .single();

  if (error || !invite) {
    return NextResponse.json(
      { error: "Invite not found or already used" },
      { status: 404 },
    );
  }

  const workspace = invite.workspaces as
    | { name: string }
    | { name: string }[]
    | null;
  const workspaceName = Array.isArray(workspace)
    ? (workspace[0]?.name ?? "Unknown")
    : (workspace?.name ?? "Unknown");

  // Get inviter email
  let inviterEmail = "your team";
  if (invite.invited_by) {
    const { data: inviter } = await serviceSupabase.auth.admin.getUserById(
      invite.invited_by,
    );
    inviterEmail = inviter?.user?.email ?? inviterEmail;
  }

  return NextResponse.json({
    workspaceName,
    role: invite.role,
    inviterEmail,
    expired: new Date(invite.expires_at) < new Date(),
    accepted: !!invite.accepted_at,
  });
}

// ── POST /api/invites/accept — accept invite (requires auth) ──────────────────
export async function POST(req: NextRequest) {
  const rl = await rateLimitOrPass(req, "invites");
  if (rl) return rl;

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, InviteAcceptSchema);
  if ("error" in parsed) return parsed.error;

  const { token } = parsed.data;

  // Fetch and validate invite
  const { data: invite, error } = await serviceSupabase
    .from("workspace_invites")
    .select("id, workspace_id, email, role, accepted_at, expires_at")
    .eq("token", token)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.accepted_at) {
    return NextResponse.json(
      { error: "This invite has already been used" },
      { status: 400 },
    );
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "This invite has expired" },
      { status: 400 },
    );
  }

  // Check user isn't already a member
  const { data: existing } = await serviceSupabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", invite.workspace_id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    // Already a member — still mark invite accepted and redirect
    await serviceSupabase
      .from("workspace_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
    return NextResponse.json({ success: true, alreadyMember: true });
  }

  // Add to workspace
  const { error: memberErr } = await serviceSupabase
    .from("workspace_members")
    .insert({
      workspace_id: invite.workspace_id,
      user_id: user.id,
      role: invite.role,
    });

  if (memberErr) {
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  // Mark invite as accepted
  await serviceSupabase
    .from("workspace_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  log.info(
    { userId: user.id, workspaceId: invite.workspace_id },
    "Invite accepted",
  );
  return NextResponse.json({ success: true });
}
