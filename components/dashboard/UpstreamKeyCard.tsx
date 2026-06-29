"use client";
import React, { useState } from "react";
import { s, fmt, fmtT } from "./shared";

type KeyUsage = {
  label: string;
  key_prefix: string;
  cost_usd: number;
  request_count: number;
  total_tokens: number;
  is_active: boolean;
  monthly_budget_usd: number | null;
  daily_requests: number;
};

type WorkspaceData = {
  name?: string;
  plan?: string;
  anthropic_key_enc?: string | null;
  openai_key_enc?: string | null;
  monthly_budget_usd?: number | null;
};

type TotalUsage = {
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  cachedRequests: number;
  liveRequests: number;
};

const PLAN_LIMITS: Record<
  string,
  { cost: number | null; tokens: number | null; requests: number | null }
> = {
  free: { cost: 5, tokens: 500_000, requests: 500 },
  starter: { cost: 50, tokens: 5_000_000, requests: 5_000 },
  team: { cost: 200, tokens: 20_000_000, requests: 50_000 },
  business: { cost: null, tokens: null, requests: null },
};

const SEGMENT_COLORS = [
  "#6366F1",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#06B6D4",
  "#F97316",
  "#EF4444",
  "#84CC16",
  "#A855F7",
];

function ProgressTooltip({
  subKey,
  totalCost,
  budget,
}: {
  subKey: KeyUsage;
  totalCost: number;
  budget: {
    cost: number | null;
    tokens: number | null;
    requests: number | null;
  };
}) {
  const k = subKey;
  const costPct =
    budget.cost != null && budget.cost > 0
      ? (k.cost_usd / budget.cost) * 100
      : null;
  const tokPct =
    budget.tokens != null && budget.tokens > 0
      ? (k.total_tokens / budget.tokens) * 100
      : null;
  const reqPct =
    budget.requests != null && budget.requests > 0
      ? (k.request_count / budget.requests) * 100
      : null;

  return (
    <div
      style={{
        background: "#1A1A1F",
        border: "1px solid #2A2A32",
        borderRadius: 10,
        padding: "14px 18px",
        minWidth: 260,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#F0F0F4" }}>
          {k.label}
        </span>
        <span
          style={{ fontSize: 11, color: "#56565F", fontFamily: "monospace" }}
        >
          {k.key_prefix}…
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <TooltipRow
          label="Cost"
          value={`$${fmt(k.cost_usd, 4)}`}
          limit={budget.cost != null ? `$${fmt(budget.cost, 2)}/mo` : null}
          pct={costPct}
        />
        <TooltipRow
          label="Tokens"
          value={fmtT(k.total_tokens)}
          limit={budget.tokens != null ? `${fmtT(budget.tokens)}/mo` : null}
          pct={tokPct}
        />
        <TooltipRow
          label="Requests"
          value={k.request_count.toLocaleString()}
          limit={
            budget.requests != null
              ? `${budget.requests.toLocaleString()}/mo`
              : null
          }
          pct={reqPct}
        />
        {k.daily_requests > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#9898A6",
            }}
          >
            <span>Today</span>
            <span style={{ fontFamily: "monospace", color: "#F0F0F4" }}>
              {k.daily_requests.toLocaleString()} req
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function TooltipRow({
  label,
  value,
  limit,
  pct,
}: {
  label: string;
  value: string;
  limit: string | null;
  pct: number | null;
}) {
  const barColor =
    pct != null
      ? pct > 90
        ? "#EF4444"
        : pct > 70
          ? "#F59E0B"
          : "#10B981"
      : "#6366F1";

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          marginBottom: 3,
        }}
      >
        <span style={{ color: "#9898A6" }}>{label}</span>
        <span style={{ fontFamily: "monospace", color: "#F0F0F4" }}>
          {value}
          {limit && <span style={{ color: "#56565F" }}> / {limit}</span>}
        </span>
      </div>
      {pct != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: "#1E1E24",
            }}
          >
            <div
              style={{
                width: `${Math.min(pct, 100)}%`,
                height: "100%",
                borderRadius: 2,
                background: barColor,
                transition: "width 0.2s",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 10,
              color: "#56565F",
              fontFamily: "monospace",
              minWidth: 32,
              textAlign: "right",
            }}
          >
            {pct.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

export function UpstreamKeyCard({
  workspace,
  totalUsage,
  keys,
}: {
  workspace: WorkspaceData | null;
  totalUsage: TotalUsage | null;
  keys: KeyUsage[];
}) {
  const [openaiConfigured, setOpenaiConfigured] = useState<boolean | null>(
    null,
  );
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const barRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetch("/api/workspace/openai")
      .then((r) => r.json())
      .then((d) => setOpenaiConfigured(d.configured ?? false))
      .catch(() => setOpenaiConfigured(false));
  }, []);

  const anthropicConfigured = !!workspace?.anthropic_key_enc;
  const totalCost = totalUsage?.totalCostUsd ?? 0;
  const totalReqs = totalUsage?.totalRequests ?? 0;
  const totalTok = totalUsage?.totalTokens ?? 0;
  const cachedReqs = totalUsage?.cachedRequests ?? 0;
  const liveReqs = totalUsage?.liveRequests ?? 0;

  // Resolve budget limits: workspace-level override > plan defaults
  const plan = workspace?.plan ?? "free";
  const planLimits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  const budgetCost = workspace?.monthly_budget_usd ?? planLimits.cost;
  const budgetTokens = planLimits.tokens;
  const budgetRequests = planLimits.requests;

  // Build progress segments from active keys with usage
  const activeKeys = keys.filter((k) => k.is_active);
  const segments = activeKeys
    .filter((k) => k.cost_usd > 0 || k.request_count > 0)
    .sort((a, b) => b.cost_usd - a.cost_usd);

  // Keys with 0 usage fill the remaining space
  const zeroKeys = activeKeys.filter(
    (k) => k.cost_usd === 0 && k.request_count === 0,
  );

  // Overall usage percentages
  const costPct =
    budgetCost != null && budgetCost > 0
      ? (totalCost / budgetCost) * 100
      : null;
  const tokPct =
    budgetTokens != null && budgetTokens > 0
      ? (totalTok / budgetTokens) * 100
      : null;
  const reqPct =
    budgetRequests != null && budgetRequests > 0
      ? (totalReqs / budgetRequests) * 100
      : null;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div style={{ ...s.card, marginTop: 20 }}>
      {/* ── Provider Status Row ──────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
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
        <div style={{ display: "flex", gap: 8 }}>
          <StatusBadge
            label="Anthropic"
            emoji="🤖"
            configured={anthropicConfigured}
          />
          <StatusBadge
            label="OpenAI"
            emoji="🧠"
            configured={openaiConfigured}
          />
        </div>
      </div>

      {/* ── Usage vs Limits ─────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <UsageLimitPill
          label="Cost"
          used={totalCost}
          limit={budgetCost}
          formatUsed={(v) => `$${fmt(v, 4)}`}
          formatLimit={(v) => `$${fmt(v, 2)}/mo`}
          pct={costPct}
        />
        <UsageLimitPill
          label="Tokens"
          used={totalTok}
          limit={budgetTokens}
          formatUsed={(v) => fmtT(v)}
          formatLimit={(v) => `${fmtT(v)}/mo`}
          pct={tokPct}
        />
        <UsageLimitPill
          label="Requests"
          used={totalReqs}
          limit={budgetRequests}
          formatUsed={(v) => v.toLocaleString()}
          formatLimit={(v) => `${v.toLocaleString()}/mo`}
          pct={reqPct}
        />
      </div>

      {/* ── Progress Bar ─────────────────────────────────────────────── */}
      {totalReqs > 0 && (
        <div style={{ marginBottom: 14, position: "relative" }}>
          <div
            ref={barRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              display: "flex",
              height: 28,
              borderRadius: 8,
              overflow: "hidden",
              background: "#18181C",
              cursor: "default",
            }}
          >
            {segments.map((k, i) => {
              const pct = totalCost > 0 ? (k.cost_usd / totalCost) * 100 : 0;
              if (pct < 0.3) return null;
              return (
                <div
                  key={k.key_prefix}
                  onMouseEnter={() => setHoveredSegment(i)}
                  style={{
                    width: `${pct}%`,
                    background:
                      hoveredSegment === i
                        ? SEGMENT_COLORS[i % SEGMENT_COLORS.length] + "DD"
                        : SEGMENT_COLORS[i % SEGMENT_COLORS.length] + "99",
                    transition: "background 0.15s",
                    borderRight:
                      i < segments.length - 1 ? "1px solid #0A0A0B" : "none",
                  }}
                />
              );
            })}
            {zeroKeys.length > 0 && (
              <div
                onMouseEnter={() => setHoveredSegment(segments.length)}
                style={{
                  flex: 1,
                  background:
                    hoveredSegment === segments.length ? "#2A2A32" : "#1E1E24",
                  transition: "background 0.15s",
                }}
              />
            )}
          </div>

          {/* ── Tooltip ─────────────────────────────────────────────── */}
          {hoveredSegment !== null && hoveredSegment < segments.length && (
            <div
              style={{
                position: "absolute",
                left: Math.max(140, Math.min(tooltipPos.x, 500)),
                top: tooltipPos.y - 16,
                transform: "translate(-50%, -100%)",
                zIndex: 100,
                pointerEvents: "none",
              }}
            >
              <ProgressTooltip
                subKey={segments[hoveredSegment]}
                totalCost={totalCost}
                budget={{
                  cost: budgetCost,
                  tokens: budgetTokens,
                  requests: budgetRequests,
                }}
              />
            </div>
          )}
          {hoveredSegment === segments.length && (
            <div
              style={{
                position: "absolute",
                left: Math.max(140, Math.min(tooltipPos.x, 500)),
                top: tooltipPos.y - 16,
                transform: "translate(-50%, -100%)",
                zIndex: 100,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  background: "#1A1A1F",
                  border: "1px solid #2A2A32",
                  borderRadius: 10,
                  padding: "12px 16px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#F0F0F4",
                  }}
                >
                  Unused capacity
                </p>
                <p
                  style={{ margin: "4px 0 0", fontSize: 12, color: "#56565F" }}
                >
                  {zeroKeys.length} key{zeroKeys.length !== 1 ? "s" : ""} with
                  no usage yet
                </p>
              </div>
            </div>
          )}

          {/* ── Legend ──────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 8,
            }}
          >
            {segments.map((k, i) => (
              <div
                key={k.key_prefix}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  cursor: "default",
                }}
                onMouseEnter={() => setHoveredSegment(i)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background:
                      SEGMENT_COLORS[i % SEGMENT_COLORS.length] + "99",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: "#9898A6",
                    whiteSpace: "nowrap",
                  }}
                >
                  {k.label} · ${fmt(k.cost_usd, 4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Clean Stats Line ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          fontSize: 12,
          color: "#9898A6",
        }}
      >
        <span>
          <strong style={{ color: "#F0F0F4", fontWeight: 500 }}>
            {totalReqs.toLocaleString()}
          </strong>{" "}
          requests
        </span>
        <span>
          <strong style={{ color: "#F0F0F4", fontWeight: 500 }}>
            {fmtT(totalTok)}
          </strong>{" "}
          tokens
        </span>
        <span>
          <strong style={{ color: "#F0F0F4", fontWeight: 500 }}>
            ${fmt(totalCost, 4)}
          </strong>{" "}
          spent
        </span>
        <span style={{ color: "#56565F" }}>·</span>
        <span>
          <span style={{ color: "#10B981" }}>
            {cachedReqs.toLocaleString()}
          </span>{" "}
          cached
        </span>
        <span>
          <span style={{ color: "#818CF8" }}>{liveReqs.toLocaleString()}</span>{" "}
          live
        </span>
      </div>
    </div>
  );
}

function UsageLimitPill({
  label,
  used,
  limit,
  formatUsed,
  formatLimit,
  pct,
}: {
  label: string;
  used: number;
  limit: number | null;
  formatUsed: (v: number) => string;
  formatLimit: (v: number) => string;
  pct: number | null;
}) {
  const barColor =
    pct != null
      ? pct > 90
        ? "#EF4444"
        : pct > 70
          ? "#F59E0B"
          : "#6366F1"
      : "#6366F1";

  return (
    <div
      style={{ background: "#18181C", borderRadius: 8, padding: "10px 14px" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "#56565F",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </span>
        {pct != null && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              fontFamily: "monospace",
              color: barColor,
            }}
          >
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            fontFamily: "monospace",
            color: "#F0F0F4",
          }}
        >
          {formatUsed(used)}
        </span>
        {limit != null && (
          <span style={{ fontSize: 12, color: "#56565F" }}>
            of {formatLimit(limit)}
          </span>
        )}
      </div>
      {pct != null && (
        <div style={{ height: 4, borderRadius: 2, background: "#1E1E24" }}>
          <div
            style={{
              width: `${Math.min(pct, 100)}%`,
              height: "100%",
              borderRadius: 2,
              background: barColor,
              transition: "width 0.3s",
            }}
          />
        </div>
      )}
      {limit == null && (
        <span style={{ fontSize: 10, color: "#56565F" }}>Unlimited</span>
      )}
    </div>
  );
}

function StatusBadge({
  label,
  emoji,
  configured,
}: {
  label: string;
  emoji: string;
  configured: boolean | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "#18181C",
        borderRadius: 8,
        padding: "6px 12px",
      }}
    >
      <span style={{ fontSize: 13 }}>{emoji}</span>
      <span style={{ fontSize: 12, color: "#9898A6" }}>{label}</span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          padding: "1px 6px",
          borderRadius: 999,
          background:
            configured === null
              ? "rgba(88,88,95,0.2)"
              : configured
                ? "rgba(16,185,129,0.15)"
                : "rgba(88,88,95,0.2)",
          color:
            configured === null
              ? "#56565F"
              : configured
                ? "#10B981"
                : "#9898A6",
        }}
      >
        {configured === null ? "…" : configured ? "✓" : "✗"}
      </span>
    </div>
  );
}
