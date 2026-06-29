"use client";
import React from "react";
import { s, fmt, fmtT } from "./shared";

type HistoryDay = {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
};
type Metric = "requests" | "tokens" | "cost";

export function UsageChart({ workspaceId }: { workspaceId: string }) {
  const [history, setHistory] = React.useState<HistoryDay[]>([]);
  const [metric, setMetric] = React.useState<Metric>("requests");
  const [tooltip, setTooltip] = React.useState<{
    x: number;
    y: number;
    day: HistoryDay;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`/api/usage/history?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => {
        setHistory(d.history ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [workspaceId]);

  const metricCfg: Record<
    Metric,
    { label: string; color: string; fmt: (v: number) => string }
  > = {
    requests: {
      label: "Requests",
      color: "#6366F1",
      fmt: (v) => v.toLocaleString(),
    },
    tokens: {
      label: "Tokens",
      color: "#10B981",
      fmt: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)),
    },
    cost: { label: "Cost", color: "#F59E0B", fmt: (v) => `$${v.toFixed(4)}` },
  };

  const cfg = metricCfg[metric];
  const values = history.map((d) => d[metric] as number);
  const maxVal = Math.max(...values, 1);

  const W = 700,
    H = 160,
    PAD = { top: 16, right: 16, bottom: 28, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const n = history.length;

  function xPos(i: number) {
    return PAD.left + (i / (n - 1)) * chartW;
  }
  function yPos(v: number) {
    return PAD.top + chartH - (v / maxVal) * chartH;
  }

  const points = history
    .map((d, i) => `${xPos(i)},${yPos(d[metric] as number)}`)
    .join(" L ");
  const linePath = n > 0 ? `M ${points}` : "";
  const areaPath =
    n > 0
      ? `M ${xPos(0)},${PAD.top + chartH} L ${points} L ${xPos(n - 1)},${PAD.top + chartH} Z`
      : "";

  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    y: yPos(maxVal * p),
    val: cfg.fmt(maxVal * p),
  }));

  const xLabels = history
    .filter((_, i) => i % 5 === 0 || i === n - 1)
    .map((d, _, arr) => ({
      i: history.indexOf(d),
      label: d.date.slice(5),
    }));

  const totalVal = values.reduce((a, b) => a + b, 0);
  const hasData = totalVal > 0;

  return (
    <div style={{ ...s.card, marginTop: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 500 }}>
            Usage — last 30 days
          </h2>
          {!loading && (
            <p style={{ margin: 0, fontSize: 12, color: "#9898A6" }}>
              Total:{" "}
              <strong style={{ color: "#F0F0F4" }}>{cfg.fmt(totalVal)}</strong>{" "}
              {cfg.label.toLowerCase()}
            </p>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "#18181C",
            borderRadius: 8,
            padding: 4,
          }}
        >
          {(Object.keys(metricCfg) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              aria-pressed={metric === m ? "true" : "false"}
              style={{
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
                background: metric === m ? metricCfg[m].color : "transparent",
                color: metric === m ? "white" : "#9898A6",
              }}
            >
              {metricCfg[m].label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            height: 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p style={{ color: "#56565F", fontSize: 13 }}>Loading…</p>
        </div>
      ) : !hasData ? (
        <div
          style={{
            height: 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <p style={{ color: "#56565F", fontSize: 13, margin: 0 }}>
            No data yet
          </p>
          <p style={{ color: "#56565F", fontSize: 12, margin: 0 }}>
            Usage will appear here after your first proxied request
          </p>
        </div>
      ) : (
        <div
          style={{ position: "relative" }}
          onMouseLeave={() => setTooltip(null)}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", overflow: "visible" }}
          >
            <defs>
              <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cfg.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={cfg.color} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {yLabels.map((l, i) => (
              <g key={i}>
                <line
                  x1={PAD.left}
                  y1={l.y}
                  x2={W - PAD.right}
                  y2={l.y}
                  stroke="#1E1E24"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 6}
                  y={l.y + 4}
                  fill="#56565F"
                  fontSize="10"
                  textAnchor="end"
                >
                  {l.val}
                </text>
              </g>
            ))}
            <path d={areaPath} fill={`url(#grad-${metric})`} />
            <path
              d={linePath}
              fill="none"
              stroke={cfg.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {xLabels.map((l) => (
              <text
                key={l.i}
                x={xPos(l.i)}
                y={H - 4}
                fill="#56565F"
                fontSize="10"
                textAnchor="middle"
              >
                {l.label}
              </text>
            ))}
            {history.map((day, i) => (
              <circle
                key={i}
                cx={xPos(i)}
                cy={yPos(day[metric] as number)}
                r={tooltip?.day.date === day.date ? 5 : 3}
                fill={
                  tooltip?.day.date === day.date ? cfg.color : "transparent"
                }
                stroke={cfg.color}
                strokeWidth="2"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) =>
                  setTooltip({
                    x: xPos(i),
                    y: yPos(day[metric] as number),
                    day,
                  })
                }
              />
            ))}
          </svg>
          {tooltip && (
            <div
              style={{
                position: "absolute",
                left: `${(tooltip.x / W) * 100}%`,
                top: `${(tooltip.y / H) * 100}%`,
                transform: "translate(-50%, -120%)",
                background: "#18181C",
                border: "1px solid #1E1E24",
                borderRadius: 8,
                padding: "8px 12px",
                pointerEvents: "none",
                zIndex: 10,
                whiteSpace: "nowrap",
              }}
            >
              <p style={{ margin: "0 0 2px", fontSize: 11, color: "#9898A6" }}>
                {tooltip.day.date}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  color: cfg.color,
                }}
              >
                {cfg.fmt(tooltip.day[metric] as number)}{" "}
                {cfg.label.toLowerCase()}
              </p>
              {metric !== "requests" && (
                <p
                  style={{ margin: "2px 0 0", fontSize: 11, color: "#9898A6" }}
                >
                  {tooltip.day.requests} requests
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
