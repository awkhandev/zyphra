"use client";
import React from "react";
import { s, fmt, fmtT } from "./shared";

type CacheStats = {
  totalEntries: number;
  totalHits: number;
  tokensSaved: number;
  costSavedUsd: number;
  lastHitAt: string | null;
};

export function CacheSavingsCard({ workspaceId }: { workspaceId: string }) {
  const [stats, setStats] = React.useState<CacheStats | null>(null);
  const [enabled, setEnabled] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    Promise.all([
      fetch(`/api/cache/stats?workspaceId=${workspaceId}`).then((r) =>
        r.json(),
      ),
      fetch(`/api/workspace/cache?workspaceId=${workspaceId}`).then((r) =>
        r.json(),
      ),
    ])
      .then(([statsRes, configRes]) => {
        setStats(statsRes.stats ?? null);
        setEnabled(configRes.cacheEnabled ?? true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [workspaceId]);

  async function toggleCache() {
    setSaving(true);
    try {
      await fetch("/api/workspace/cache", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId, cacheEnabled: !enabled }),
      });
      setEnabled(!enabled);
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
            Prompt Cache
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: "#9898A6" }}>
            Identical non-streaming requests are served from cache. Saves 100%
            of API cost on hits.
          </p>
        </div>
        <button
          onClick={toggleCache}
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

      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 12,
          }}
        >
          {[
            { label: "Cached entries", value: String(stats.totalEntries) },
            { label: "Cache hits", value: String(stats.totalHits) },
            { label: "Tokens saved", value: fmtT(stats.tokensSaved) },
            { label: "Cost saved", value: `$${fmt(stats.costSavedUsd, 4)}` },
          ].map((c) => (
            <div
              key={c.label}
              style={{
                background: "#18181C",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9898A6" }}>
                {c.label}
              </p>
              <p
                style={{ margin: 0, fontSize: 16, fontWeight: 600, ...s.mono }}
              >
                {c.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
