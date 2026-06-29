import { serviceSupabase } from "./supabase-server";
import { sendEmail } from "./mailer";
import { createLogger } from "./logger";

const log = createLogger("alerts");

const THRESHOLDS = [80, 100] as const;

function buildEmail(opts: {
  workspaceName: string;
  keyLabel: string;
  threshold: number;
  spentUsd: number;
  budgetUsd: number;
  appUrl: string;
}): { subject: string; html: string } {
  const { workspaceName, keyLabel, threshold, spentUsd, budgetUsd, appUrl } =
    opts;
  const isOver = threshold === 100;
  const pct = Math.min(Math.round((spentUsd / budgetUsd) * 100), 100);
  const barColor = isOver ? "#EF4444" : "#F59E0B";
  const emoji = isOver ? "🚨" : "⚠️";
  const subject = `${emoji} Zyphra: "${keyLabel}" hit ${threshold}% of monthly budget`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:Inter,system-ui,sans-serif">
<div style="max-width:520px;margin:40px auto;padding:0 16px">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px">
    <div style="width:32px;height:32px;background:#6366F1;border-radius:8px;display:flex;align-items:center;justify-content:center">
      <span style="color:white;font-size:16px;font-weight:700">T</span>
    </div>
    <span style="color:#F0F0F4;font-size:18px;font-weight:600">Zyphra</span>
  </div>
  <div style="background:#111113;border:1px solid #1E1E24;border-radius:12px;padding:28px;margin-bottom:20px">
    <div style="font-size:28px;margin-bottom:12px">${emoji}</div>
    <h1 style="color:#F0F0F4;font-size:20px;font-weight:600;margin:0 0 8px">
      Budget ${isOver ? "exceeded" : "alert"}: ${threshold}%
    </h1>
    <p style="color:#9898A6;font-size:14px;margin:0 0 24px;line-height:1.5">
      The key <strong style="color:#F0F0F4">"${keyLabel}"</strong> in workspace
      <strong style="color:#F0F0F4">${workspaceName}</strong> has used ${pct}% of its monthly budget.
    </p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div style="background:#18181C;border-radius:8px;padding:14px">
        <div style="color:#9898A6;font-size:11px;margin-bottom:4px;text-transform:uppercase">Spent</div>
        <div style="color:#F0F0F4;font-size:22px;font-weight:600;font-family:monospace">$${spentUsd.toFixed(4)}</div>
      </div>
      <div style="background:#18181C;border-radius:8px;padding:14px">
        <div style="color:#9898A6;font-size:11px;margin-bottom:4px;text-transform:uppercase">Budget</div>
        <div style="color:#F0F0F4;font-size:22px;font-weight:600;font-family:monospace">$${budgetUsd.toFixed(2)}</div>
      </div>
    </div>
    <div style="background:#18181C;border-radius:4px;height:8px;overflow:hidden;margin-bottom:8px">
      <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px"></div>
    </div>
    <div style="color:#9898A6;font-size:12px;text-align:right;font-family:monospace">${pct}% used</div>
  </div>
  <div style="text-align:center;margin-bottom:32px">
    ${
      isOver
        ? `<p style="color:#EF4444;font-size:13px;margin-bottom:16px">⛔ This key is now blocked until next month or budget is increased.</p>`
        : `<p style="color:#9898A6;font-size:13px;margin-bottom:16px">The key is still active. You may want to review usage or adjust the budget.</p>`
    }
    <a href="${appUrl}/dashboard" style="display:inline-block;background:#6366F1;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:500">
      View Dashboard →
    </a>
  </div>
  <p style="color:#56565F;font-size:11px;text-align:center;margin:0">
    You're receiving this because you own the <strong>${workspaceName}</strong> workspace on Zyphra.
  </p>
</div>
</body>
</html>`;

  return { subject, html };
}

export async function checkAndFireAlerts(opts: {
  subKeyId: string;
  workspaceId: string;
  keyLabel: string;
  spentUsd: number;
  budgetUsd: number;
}): Promise<void> {
  const { subKeyId, workspaceId, keyLabel, spentUsd, budgetUsd } = opts;

  if (!process.env.RESEND_API_KEY && !process.env.BREVO_API_KEY) return;

  const pct = (spentUsd / budgetUsd) * 100;
  const crossed = THRESHOLDS.filter((t) => pct >= t);
  if (crossed.length === 0) return;

  const { data: workspace } = await serviceSupabase
    .from("workspaces")
    .select("name, owner_id")
    .eq("id", workspaceId)
    .single();

  if (!workspace) return;

  const { data: authData } = await serviceSupabase.auth.admin.getUserById(
    workspace.owner_id,
  );
  const ownerEmail = authData?.user?.email;
  if (!ownerEmail) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://zyphra.vercel.app";

  for (const threshold of crossed) {
    const { data: existing } = await serviceSupabase
      .from("budget_alerts")
      .select("id, last_fired_at")
      .eq("sub_key_id", subKeyId)
      .eq("threshold_pct", threshold)
      .single();

    if (existing?.last_fired_at) {
      const fired = new Date(existing.last_fired_at);
      const now = new Date();
      if (
        fired.getMonth() === now.getMonth() &&
        fired.getFullYear() === now.getFullYear()
      )
        continue;
    }

    const { subject, html } = buildEmail({
      workspaceName: workspace.name,
      keyLabel,
      threshold,
      spentUsd,
      budgetUsd,
      appUrl,
    });

    const result = await sendEmail({ to: ownerEmail, subject, html });
    if (!result.ok) {
      log.error(
        { err: result.error, keyLabel, threshold },
        "Alert email failed",
      );
      continue;
    }
    log.info({ keyLabel, threshold, workspaceId }, "Budget alert fired");

    if (existing) {
      await serviceSupabase
        .from("budget_alerts")
        .update({ last_fired_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await serviceSupabase.from("budget_alerts").insert({
        sub_key_id: subKeyId,
        workspace_id: workspaceId,
        threshold_pct: threshold,
        last_fired_at: new Date().toISOString(),
        channel: "email",
      });
    }
  }
}
