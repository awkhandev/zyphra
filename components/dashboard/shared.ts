import React from "react";

// ── Shared types ──────────────────────────────────────────────────────────────
export type Workspace = {
  id: string;
  name: string;
  plan: string;
  anthropic_key_enc?: string | null;
  openai_key_enc?: string | null;
};
export type KeySummary = {
  sub_key_id: string;
  label: string;
  key_prefix: string;
  monthly_budget_usd: number | null;
  is_active: boolean;
  request_count: number;
  total_tokens: number;
  cost_usd: number;
  daily_requests: number;
  last_used_at: string | null;
};
export type Totals = {
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  dailyRequests: number;
};

// ── Formatters ────────────────────────────────────────────────────────────────
export const fmt = (n: number, d = 2) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
export const fmtT = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}k`
      : String(n);
export const ago = (iso: string | null) => {
  if (!iso) return "Never";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ── Shared styles ─────────────────────────────────────────────────────────────
export const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0A0A0B",
    color: "#F0F0F4",
    fontFamily: "Inter,system-ui,sans-serif",
    padding: "1.5rem",
  },
  card: {
    background: "#111113",
    border: "1px solid #1E1E24",
    borderRadius: 10,
    padding: "1.25rem",
  },
  label: { display: "block", fontSize: 12, color: "#9898A6", marginBottom: 6 },
  input: {
    width: "100%",
    background: "#18181C",
    border: "1px solid #1E1E24",
    borderRadius: 7,
    color: "#F0F0F4",
    fontSize: 14,
    padding: "9px 12px",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  btnPrim: {
    background: "#6366F1",
    color: "white",
    fontWeight: 500,
    fontSize: 14,
    padding: "9px 16px",
    borderRadius: 7,
    border: "none",
    cursor: "pointer",
  },
  btnGhost: {
    background: "transparent",
    color: "#9898A6",
    fontSize: 13,
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #1E1E24",
    cursor: "pointer",
  },
  mono: { fontFamily: "'JetBrains Mono',monospace" },
};
