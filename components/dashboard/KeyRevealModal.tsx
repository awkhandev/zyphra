"use client";
import React, { useState } from "react";
import { s } from "./shared";

export function KeyRevealModal({
  rawKey,
  onClose,
}: {
  rawKey: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://yourapp.vercel.app";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Key created — save it now"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "1rem",
      }}
    >
      <div style={{ ...s.card, width: "100%", maxWidth: 460 }}>
        <h2
          style={{
            margin: "0 0 4px",
            fontSize: 16,
            fontWeight: 600,
            color: "#10B981",
          }}
        >
          ✓ Key created — save it now
        </h2>
        <p style={{ margin: "0 0 1rem", fontSize: 13, color: "#9898A6" }}>
          This key will not be shown again.
        </p>
        <div
          style={{
            background: "#18181C",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: "1rem",
          }}
        >
          <span
            style={{
              ...s.mono,
              fontSize: 13,
              color: "#818CF8",
              flex: 1,
              wordBreak: "break-all",
            }}
          >
            {rawKey}
          </span>
          <button
            onClick={copy}
            style={{ ...s.btnGhost, whiteSpace: "nowrap", fontSize: 12 }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div
          style={{
            background: "rgba(245,158,11,0.1)",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#F59E0B" }}>
            Add to ~/.claude/settings.json:
          </p>
          <pre
            style={{
              ...s.mono,
              fontSize: 11,
              color: "#F0F0F4",
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >{`"env": {
  "ANTHROPIC_BASE_URL": "${origin}/api",
  "ANTHROPIC_AUTH_TOKEN": "${rawKey}"
}`}</pre>
        </div>
        <button onClick={onClose} style={{ ...s.btnPrim, width: "100%" }}>
          Done, I saved the key
        </button>
      </div>
    </div>
  );
}
