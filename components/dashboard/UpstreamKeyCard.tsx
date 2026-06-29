"use client";
import React, { useState } from "react";
import { s, fmt } from "./shared";

type KeyUsage = {
  label: string;
  key_prefix: string;
  cost_usd: number;
  request_count: number;
  total_tokens: number;
  is_active: boolean;
};

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
  keys,
  totalCost,
}: {
  keys: KeyUsage[];
  totalCost: number;
}) {
  return (
    <div
      style={{
        background: "#1A1A1F",
        border: "1px solid #2A2A32",
        borderRadius: 10,
        padding: "14px 18px",
        minWidth: 320,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <p
        style={{
          margin: "0 0 10px",
          fontSize: 11,
          fontWeight: 600,
          color: "#9898A6",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Sub-key breakdown
      </p>
      {keys
        .filter((k) => k.cost_usd > 0 || k.request_count > 0)
        .sort((a, b) => b.cost_usd - a.cost_usd)
        .map((k, i) => {
          const pct = totalCost > 0 ? (k.cost_usd / totalCost) * 100 : 0;
          return (
            <div
              key={k.key_prefix}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 0",
                borderTop: i === 0 ? "none" : "1px solid #2A2A32",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#F0F0F4",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {k.label}
                </p>
                <p
                  style={{
                    margin: "1px 0 0",
                    fontSize: 11,
                    color: "#56565F",
                    fontFamily: "monospace",
                  }}
                >
                  {k.key_prefix}…
                </p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#F0F0F4",
                    fontFamily: "monospace",
                  }}
                >
                  ${fmt(k.cost_usd, 4)}
                </p>
                <p
                  style={{
                    margin: "1px 0 0",
                    fontSize: 11,
                    color: "#56565F",
                  }}
                >
                  {k.request_count.toLocaleString()} req ·{" "}
                  {k.total_tokens >= 1_000_000
                    ? `${(k.total_tokens / 1_000_000).toFixed(1)}M`
                    : k.total_tokens >= 1_000
                      ? `${(k.total_tokens / 1_000).toFixed(0)}k`
                      : k.total_tokens}{" "}
                  tok
                </p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "#56565F",
                  flexShrink: 0,
                  minWidth: 38,
                  textAlign: "right",
                }}
              >
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      {keys.filter((k) => k.cost_usd > 0 || k.request_count > 0).length ===
        0 && (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#56565F" }}>
          No usage recorded yet
        </p>
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

  // Build progress segments from active keys with usage
  const activeKeys = keys.filter((k) => k.is_active);
  const segments = activeKeys
    .filter((k) => k.cost_usd > 0 || k.request_count > 0)
    .sort((a, b) => b.cost_usd - a.cost_usd);

  // Keys with 0 usage fill the remaining space proportionally
  const zeroKeys = activeKeys.filter(
    (k) => k.cost_usd === 0 && k.request_count === 0,
  );

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

      {/* ── Progress Bar ─────────────────────────────────────────────── */}
      {totalReqs > 0 && (
        <div style={{ marginBottom: 14 }}>
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
              position: "relative",
            }}
          >
            {segments.map((k, i) => {
              const pct = totalCost > 0 ? (k.cost_usd / totalCost) * 100 : 0;
              if (pct < 0.3) return null; // skip micro segments
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
                left: Math.min(tooltipPos.x, 600),
                top: tooltipPos.y - 12,
                transform: "translate(-50%, -100%)",
                zIndex: 100,
                pointerEvents: "none",
              }}
            >
              <ProgressTooltip
                keys={[segments[hoveredSegment]]}
                totalCost={totalCost}
              />
            </div>
          )}
          {hoveredSegment === segments.length &&
            hoveredSegment === segments.length && (
              <div
                style={{
                  position: "absolute",
                  left: Math.min(tooltipPos.x, 600),
                  top: tooltipPos.y - 12,
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
                    style={{
                      margin: "4px 0 0",
                      fontSize: 12,
                      color: "#56565F",
                    }}
                  >
                    {zeroKeys.length} key
                    {zeroKeys.length !== 1 ? "s" : ""} with no usage yet
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
            {totalTok >= 1_000_000
              ? `${(totalTok / 1_000_000).toFixed(1)}M`
              : totalTok >= 1_000
                ? `${(totalTok / 1_000).toFixed(0)}k`
                : totalTok}
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
