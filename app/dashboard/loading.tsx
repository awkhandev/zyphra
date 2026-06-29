import {
  StatCardSkeleton,
  ChartSkeleton,
  KeysTableSkeleton,
} from "@/components/Skeleton";

/**
 * Dashboard loading state — shown while the server-side auth guard
 * in layout.tsx verifies the session and the page fetches workspace data.
 */
export default function DashboardLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label="Loading dashboard"
      style={{
        minHeight: "100vh",
        background: "#0A0A0B",
        color: "#F0F0F4",
        fontFamily: "Inter, system-ui, sans-serif",
        maxWidth: 1100,
        margin: "0 auto",
        padding: "1.5rem",
      }}
    >
      {/* Header skeleton */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "#18181C",
          }}
        />
        <div
          style={{
            width: 120,
            height: 14,
            borderRadius: 4,
            background: "#18181C",
          }}
        />
      </div>
      {/* Stat cards skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
          gap: 16,
          marginBottom: "2rem",
        }}
      >
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      {/* Chart skeleton */}
      <ChartSkeleton />
      {/* Keys table skeleton */}
      <div style={{ marginTop: "2rem" }}>
        <KeysTableSkeleton />
      </div>
    </main>
  );
}
