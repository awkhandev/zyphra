"use client";
import React from "react";
import { s, fmt } from "./shared";

type WorkspaceData = {
  name?: string;
  plan?: string;
  anthropic_key_enc?: string | null;
  openai_key_enc?: string | null;
};

type TotalUsage = {
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  cachedRequests: number;
  liveRequests: number;
};

export function UpstreamKeyCard({
  workspace,
  totalUsage,
}: {
  workspace: WorkspaceData | null;
  totalUsage: TotalUsage | null;
}) {
  const [openaiConfigured, setOpenaiConfigured] = React.useState<
    boolean | null
  >(null);

  React.useEffect(() => {
    fetch("/api/workspace/openai")
      .then((r) => r.json())
      .then((d) => setOpenaiConfigured(d.configured ?? false))
      .catch(() => setOpenaiConfigured(false));
  }, []);

  const anthropicConfigured = !!workspace?.anthropic_key_enc;

  return (
    <div style={{ ...s.card, marginTop: 20 }}>
      {/* ── Upstream Keys Status ──────────────────────────────────────── */}
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
            Upstream API keys
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: "#9898A6" }}>
            Your encrypted provider keys that route traffic to upstream APIs.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Anthropic */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#18181C",
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>🤖</span>
            <div>
              <p style={{ margin: 0, fontSize: 13 }}>Anthropic (Claude)</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9898A6" }}>
                Endpoint: api.anthropic.com
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: 999,
              background: anthropicConfigured
                ? "rgba(16,185,129,0.15)"
                : "rgba(88,88,95,0.2)",
              color: anthropicConfigured ? "#10B981" : "#9898A6",
            }}
          >
            {anthropicConfigured ? "✓ Configured" : "Not configured"}
          </span>
        </div>

        {/* OpenAI */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#18181C",
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>🧠</span>
            <div>
              <p style={{ margin: 0, fontSize: 13 }}>OpenAI (GPT)</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9898A6" }}>
                Endpoint: api.openai.com
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: 999,
              background:
                openaiConfigured === null
                  ? "rgba(88,88,95,0.2)"
                  : openaiConfigured
                    ? "rgba(16,185,129,0.15)"
                    : "rgba(88,88,95,0.2)",
              color:
                openaiConfigured === null
                  ? "#9898A6"
                  : openaiConfigured
                    ? "#10B981"
                    : "#9898A6",
            }}
          >
            {openaiConfigured === null
              ? "…"
              : openaiConfigured
                ? "✓ Configured"
                : "Not configured"}
          </span>
        </div>
      </div>

      {/* ── Workspace Total Usage ────────────────────────────────────── */}
      {totalUsage && totalUsage.totalRequests > 0 && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid #1E1E24",
          }}
        >
          <h3
            style={{
              margin: "0 0 10px",
              fontSize: 13,
              fontWeight: 500,
              color: "#9898A6",
            }}
          >
            Total usage across all sub-keys (this month)
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            {[
              {
                label: "Total cost",
                value: `$${fmt(totalUsage.totalCostUsd, 4)}`,
                color: "#F0F0F4",
              },
              {
                label: "Total requests",
                value: totalUsage.totalRequests.toLocaleString(),
                color: "#F0F0F4",
              },
              {
                label: "Cached",
                value: `${totalUsage.cachedRequests.toLocaleString()} / ${totalUsage.liveRequests.toLocaleString()}`,
                color: "#10B981",
                sub: "cached / live",
              },
              {
                label: "Total tokens",
                value:
                  totalUsage.totalTokens >= 1_000_000
                    ? `${(totalUsage.totalTokens / 1_000_000).toFixed(2)}M`
                    : totalUsage.totalTokens >= 1_000
                      ? `${(totalUsage.totalTokens / 1_000).toFixed(1)}k`
                      : String(totalUsage.totalTokens),
                color: "#F0F0F4",
              },
            ].map((m) => (
              <div key={m.label}>
                <p
                  style={{
                    margin: "0 0 4px",
                    fontSize: 11,
                    color: "#56565F",
                  }}
                >
                  {m.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 17,
                    fontWeight: 600,
                    color: m.color,
                    ...s.mono,
                  }}
                >
                  {m.value}
                </p>
                {m.sub && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 10,
                      color: "#56565F",
                    }}
                  >
                    {m.sub}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
