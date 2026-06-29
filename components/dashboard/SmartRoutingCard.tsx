"use client";
import React from "react";
import { s } from "./shared";

type RoutingConfig = {
  simple: string;
  medium: string;
  complex: string;
};

export function SmartRoutingCard({ workspaceId }: { workspaceId: string }) {
  const [enabled, setEnabled] = React.useState(false);
  const [config, setConfig] = React.useState<RoutingConfig>({
    simple: "claude-haiku-4-5-20251001",
    medium: "claude-sonnet-4-6",
    complex: "passthrough",
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/workspace/routing?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((res) => {
        setEnabled(res.routingEnabled ?? false);
        setConfig(
          res.routingConfig ?? {
            simple: "claude-haiku-4-5-20251001",
            medium: "claude-sonnet-4-6",
            complex: "passthrough",
          },
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [workspaceId]);

  async function save() {
    setSaving(true);
    setSuccess(false);
    try {
      await fetch("/api/workspace/routing", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          routingEnabled: enabled,
          routingConfig: config,
        }),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {}
    setSaving(false);
  }

  if (loading) return null;

  return (
    <div style={{ ...s.card, marginTop: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 500 }}>
            Smart Model Routing
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: "#9898A6" }}>
            Automatically route simple prompts to cheaper models. Saves 50-80%
            on easy requests.
          </p>
        </div>
        <button
          onClick={() => {
            setEnabled(!enabled);
            setTimeout(save, 100);
          }}
          disabled={saving}
          style={{
            ...s.btnPrim,
            fontSize: 12,
            padding: "6px 14px",
            background: enabled ? "rgba(16,185,129,0.15)" : "#18181C",
            color: enabled ? "#10B981" : "#9898A6",
            border: enabled
              ? "1px solid rgba(16,185,129,0.3)"
              : "1px solid #1E1E24",
          }}
        >
          {saving ? "..." : enabled ? "Enabled" : "Disabled"}
        </button>
      </div>

      <p style={{ margin: "0 0 12px", fontSize: 11, color: "#9898A6" }}>
        Complexity is scored by prompt length, code signals, and token count.
        Unchanged model = passthrough.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {[
          {
            tier: "Simple",
            key: "simple" as const,
            desc: "Short, non-technical prompts",
          },
          {
            tier: "Medium",
            key: "medium" as const,
            desc: "Moderate-length prompts",
          },
          {
            tier: "Complex",
            key: "complex" as const,
            desc: "Code, long context, technical",
          },
        ].map((t) => (
          <div
            key={t.key}
            style={{
              background: "#18181C",
              borderRadius: 8,
              padding: "10px 12px",
            }}
          >
            <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9898A6" }}>
              {t.tier}
            </p>
            <p style={{ margin: "0 0 6px", fontSize: 10, color: "#56565F" }}>
              {t.desc}
            </p>
            <select
              value={config[t.key]}
              onChange={(e) =>
                setConfig({ ...config, [t.key]: e.target.value })
              }
              style={{
                width: "100%",
                background: "#0A0A0B",
                border: "1px solid #1E1E24",
                borderRadius: 6,
                color: "#F0F0F4",
                fontSize: 12,
                padding: "6px 8px",
                outline: "none",
                boxSizing: "border-box",
              }}
            >
              {t.key === "complex" && (
                <option value="passthrough">
                  Passthrough (original model)
                </option>
              )}
              <option value="claude-haiku-4-5-20251001">
                Claude Haiku 4.5
              </option>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
            </select>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={save}
          disabled={saving}
          style={{ ...s.btnPrim, fontSize: 12, padding: "6px 14px" }}
        >
          {saving ? "Saving..." : "Save config"}
        </button>
        {success && (
          <span style={{ fontSize: 12, color: "#10B981" }}>Saved!</span>
        )}
      </div>
    </div>
  );
}
