"use client";
import React from "react";
import { s } from "./shared";

export function InviteSection({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("member");
  const [loading, setLoading] = React.useState(false);
  const [invites, setInvites] = React.useState<
    {
      id: string;
      email: string;
      role: string;
      accepted_at: string | null;
      expires_at: string;
    }[]
  >([]);
  const [result, setResult] = React.useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  /* eslint-disable react-hooks/exhaustive-deps */
  React.useEffect(() => {
    loadInvites();
  }, [workspaceId]);
  /* eslint-enable react-hooks/exhaustive-deps */

  async function loadInvites() {
    const res = await fetch(`/api/invites?workspaceId=${workspaceId}`);
    if (res.ok) {
      const d = await res.json();
      setInvites(d.invites ?? []);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult({
        ok: true,
        msg: data.warning
          ? `Invite created. ${data.warning}`
          : `Invite sent to ${email}`,
      });
      setEmail("");
      loadInvites();
    } catch (err) {
      setResult({
        ok: false,
        msg: err instanceof Error ? err.message : "Failed",
      });
    } finally {
      setLoading(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this invite?")) return;
    await fetch(`/api/invites?id=${id}&workspaceId=${workspaceId}`, {
      method: "DELETE",
    });
    loadInvites();
  }

  const pending = invites.filter(
    (i) => !i.accepted_at && new Date(i.expires_at) > new Date(),
  );

  return (
    <div style={{ ...s.card, marginTop: 20 }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 500 }}>
        Invite team members
      </h2>
      <form
        onSubmit={send}
        style={{
          display: "flex",
          gap: 8,
          marginBottom: pending.length ? 16 : 0,
        }}
      >
        <input
          type="email"
          placeholder="developer@company.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ ...s.input, flex: 1 }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ ...s.input, width: "auto", paddingRight: 12 }}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          style={{ ...s.btnPrim, whiteSpace: "nowrap" }}
          disabled={loading}
        >
          {loading ? "Sending…" : "Send invite"}
        </button>
      </form>
      {result && (
        <p
          style={{
            fontSize: 12,
            margin: "8px 0 0",
            color: result.ok ? "#10B981" : "#EF4444",
          }}
        >
          {result.msg}
        </p>
      )}
      {pending.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, color: "#9898A6", margin: "0 0 8px" }}>
            Pending invites ({pending.length})
          </p>
          {pending.map((inv) => (
            <div
              key={inv.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderTop: "1px solid #1E1E24",
              }}
            >
              <div>
                <span style={{ fontSize: 13 }}>{inv.email}</span>
                <span style={{ fontSize: 11, color: "#9898A6", marginLeft: 8 }}>
                  {inv.role}
                </span>
              </div>
              <button
                onClick={() => revoke(inv.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#EF4444",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
