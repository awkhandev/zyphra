"use client";
import { useEffect } from "react";

export default function DocsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[docs/error]", error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0A0A0B",
        color: "#F0F0F4",
        fontFamily: "Inter, system-ui, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "#111113",
          border: "1px solid #1E1E24",
          borderRadius: 12,
          padding: "2.5rem",
          maxWidth: 440,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "rgba(245,158,11,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
            fontSize: 24,
          }}
          aria-hidden
        >
          📖
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>
          Docs unavailable
        </h1>
        <p
          style={{
            color: "#9898A6",
            fontSize: 14,
            lineHeight: 1.6,
            margin: "0 0 1.5rem",
          }}
        >
          We couldn&apos;t load the documentation. Please try again.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={() => reset()}
            style={{
              background: "#6366F1",
              color: "white",
              fontWeight: 500,
              fontSize: 14,
              padding: "10px 22px",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              background: "transparent",
              color: "#9898A6",
              fontSize: 14,
              padding: "10px 22px",
              borderRadius: 7,
              border: "1px solid #1E1E24",
              textDecoration: "none",
            }}
          >
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
