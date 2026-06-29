import React from "react";

/**
 * Reusable skeleton loading component with animated shimmer effect.
 * Use as placeholder while data is loading.
 */

const shimmer: React.CSSProperties = {
  background: "linear-gradient(90deg, #18181C 25%, #252530 50%, #18181C 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s ease-in-out infinite",
};

// Inject keyframes once in the browser
if (typeof document !== "undefined") {
  const id = "skeleton-keyframes";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }
}

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  className?: string;
};

export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 6,
  className,
}: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        ...shimmer,
      }}
      aria-hidden="true"
    />
  );
}

// ── Preset skeletons for dashboard ───────────────────────────────────────────

export function StatCardSkeleton() {
  return (
    <div
      style={{
        background: "#111113",
        border: "1px solid #1E1E24",
        borderRadius: 10,
        padding: "1.25rem",
      }}
    >
      <Skeleton width={80} height={12} />
      <Skeleton width={120} height={28} borderRadius={4} />
      <Skeleton width={60} height={12} />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div
      style={{
        background: "#111113",
        border: "1px solid #1E1E24",
        borderRadius: 10,
        padding: "1.25rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Skeleton width={180} height={14} />
        <Skeleton width={120} height={28} borderRadius={6} />
      </div>
      <Skeleton height={160} borderRadius={6} />
    </div>
  );
}

export function KeysTableSkeleton() {
  return (
    <div
      style={{
        background: "#111113",
        border: "1px solid #1E1E24",
        borderRadius: 10,
        padding: "1.25rem",
      }}
    >
      <Skeleton width={100} height={14} />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
            gap: 16,
            padding: "12px 0",
            borderTop: i > 1 ? "1px solid #1E1E24" : undefined,
          }}
        >
          <Skeleton height={14} />
          <Skeleton height={14} />
          <Skeleton height={14} />
          <Skeleton height={14} />
          <Skeleton height={14} />
        </div>
      ))}
    </div>
  );
}
