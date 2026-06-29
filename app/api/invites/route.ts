import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, serviceSupabase } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/mailer";
import { rateLimitOrPass } from "@/lib/rate-limit";
import { validateBody, InviteCreateSchema } from "@/lib/validation";
import { createLogger } from "@/lib/logger";

const log = createLogger("invites");

export const dynamic = "force-dynamic";

// ── Helpers ───────────────────────────────────────────────────────────────────
async function isAdmin(workspaceId: string, userId: string): Promise<boolean> {
  const { data: ws } = await serviceSupabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();
  if (ws?.owner_id === userId) return true;

  const { data: m } = await serviceSupabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();
  return !!m && ["owner", "admin"].includes(m.role);
}

function buildInviteEmail(opts: {
  workspaceName: string;
  inviterEmail: string;
  inviteUrl: string;
  role: string;
  expiresInDays: number;
}): { subject: string; html: string } {
  const { workspaceName, inviterEmail, inviteUrl, role, expiresInDays } = opts;
  const subject = `You've been invited to join ${workspaceName} on Zyphra`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:Inter,system-ui,sans-serif">
<div style="max-width:520px;margin:40px auto;padding:0 16px">

  <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px">
    <div style="width:32px;height:32px;background:#6366F1;border-radius:8px;
      display:flex;align-items:center;justify-content:center">
      <span style="color:white;font-size:16px;font-weight:700">T</span>
    </div>
    <span style="color:#F0F0F4;font-size:18px;font-weight:600">Zyphra</span>
  </div>

  <div style="background:#111113;border:1px solid #1E1E24;border-radius:12px;padding:28px;margin-bottom:20px">
    <h1 style="color:#F0F0F4;font-size:20px;font-weight:600;margin:0 0 12px">
      You've been invited 👋
    </h1>
    <p style="color:#9898A6;font-size:14px;margin:0 0 8px;line-height:1.6">
      <strong style="color:#F0F0F4">${inviterEmail}</strong> has invited you to join the
      <strong style="color:#F0F0F4">${workspaceName}</strong> workspace on Zyphra as a
      <span style="color:#818CF8;font-weight:500">${role}</span>.
    </p>
    <p style="color:#9898A6;font-size:13px;margin:0 0 24px">
      Zyphra manages AI API keys for your team — you'll get your own sub-key with
      usage tracking and budget limits.
    </p>
    <a href="${inviteUrl}"
       style="display:inline-block;background:#6366F1;color:white;text-decoration:none;
              padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
      Accept invitation →
    </a>
  </div>

  <p style="color:#56565F;font-size:12px;text-align:center;margin:0">
    This invite expires in ${expiresInDays} days. If you weren't expecting this, you can ignore it.
  </p>
</div>
</body>
</html>`;

  return { subject, html };
}

// ── GET /api/invites?workspaceId=<id> — list pending invites ──────────────────
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

  if (!(await isAdmin(workspaceId, user.id)))
    return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { data, error } = await serviceSupabase
    .from("workspace_invites")
    .select("id, email, role, created_at, expires_at, accepted_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    log.error({ err: error }, "Failed to list invites");
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 },
    );
  }
  return NextResponse.json({ invites: data ?? [] });
}

// ── POST /api/invites — create invite and send email ──────────────────────────
export async function POST(req: NextRequest) {
  const rl = await rateLimitOrPass(req, "invites");
  if (rl) return rl;

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, InviteCreateSchema);
  if ("error" in parsed) return parsed.error;

  const { workspaceId, email, role = "member" } = parsed.data;

  if (!(await isAdmin(workspaceId, user.id)))
    return NextResponse.json({ error: "Admins only" }, { status: 403 });

  // Get workspace name + inviter email
  const [{ data: ws }, { data: inviterAuth }] = await Promise.all([
    serviceSupabase
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single(),
    serviceSupabase.auth.admin.getUserById(user.id),
  ]);

  if (!ws)
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const inviterEmail = inviterAuth?.user?.email ?? "your team";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://zyphra.vercel.app";

  // Upsert invite (handles resend case)
  const { data: invite, error: inviteErr } = await serviceSupabase
    .from("workspace_invites")
    .upsert(
      {
        workspace_id: workspaceId,
        invited_by: user.id,
        email: email.toLowerCase().trim(),
        role,
        accepted_at: null,
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      { onConflict: "workspace_id,email", ignoreDuplicates: false },
    )
    .select("token")
    .single();

  if (inviteErr)
    return NextResponse.json({ error: inviteErr.message }, { status: 500 });

  const inviteUrl = `${appUrl}/invite/${invite.token}`;
  const { subject, html } = buildInviteEmail({
    workspaceName: ws.name,
    inviterEmail,
    inviteUrl,
    role,
    expiresInDays: 7,
  });

  const mailResult = await sendEmail({ to: email, subject, html });
  if (!mailResult.ok) {
    log.error({ err: mailResult.error }, "Invite email failed");
    // Don't fail the whole request — invite is created, just email failed
    return NextResponse.json({
      success: true,
      warning: `Invite created but email failed: ${mailResult.error}`,
      inviteUrl, // Return URL so admin can share manually
    });
  }

  return NextResponse.json({ success: true, inviteUrl }, { status: 201 });
}

// ── DELETE /api/invites?id=<id>&workspaceId=<id> — revoke invite ──────────────
export async function DELETE(req: NextRequest) {
  const rl = await rateLimitOrPass(req, "invites");
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

  if (!(await isAdmin(workspaceId, user.id)))
    return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const { error } = await serviceSupabase
    .from("workspace_invites")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) {
    log.error({ err: error }, "Failed to delete invite");
    return NextResponse.json(
      { error: "Failed to revoke invite" },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true });
}
