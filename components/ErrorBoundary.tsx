"use client";
import React from "react";
import { createLogger } from "@/lib/logger";

const log = createLogger("ErrorBoundary");

type Props = { children: React.ReactNode; fallback?: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    log.error(
      { err: error, componentStack: info.componentStack },
      "React error boundary caught error",
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
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
            role="alert"
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
                background: "rgba(239,68,68,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1.25rem",
                fontSize: 24,
              }}
            >
              ⚠️
            </div>
            <h1 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>
              Something went wrong
            </h1>
            <p
              style={{
                color: "#9898A6",
                fontSize: 14,
                lineHeight: 1.6,
                margin: "0 0 1.5rem",
              }}
            >
              An unexpected error occurred. Try refreshing the page.
            </p>
            <div
              aria-live="assertive"
              style={{
                background: "#18181C",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: "1.5rem",
                fontSize: 12,
                color: "#EF4444",
                fontFamily: "JetBrains Mono, monospace",
                wordBreak: "break-word",
              }}
            >
              {this.state.error?.message ?? "Unknown error"}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={() => window.location.reload()}
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
                Refresh page
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
                  cursor: "pointer",
                }}
              >
                Go home
              </a>
            </div>
            <p
              style={{
                marginTop: "1.5rem",
                fontSize: 12,
                color: "#56565F",
                margin: "1.5rem 0 0",
              }}
            >
              If this keeps happening, email{" "}
              <a
                href="mailto:support@zyphra.app"
                style={{ color: "#6366F1", textDecoration: "none" }}
              >
                support@zyphra.app
              </a>
            </p>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
