/**
 * Auth loading state — shown while checking session in middleware.
 */
export default function AuthLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label="Loading"
      style={{
        minHeight: "100vh",
        background: "#0A0A0B",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 28,
            height: 28,
            background: "#6366F1",
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
          }}
        >
          <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>
            T
          </span>
        </div>
        <p style={{ color: "#56565F", fontSize: 13 }}>Loading…</p>
      </div>
    </main>
  );
}
