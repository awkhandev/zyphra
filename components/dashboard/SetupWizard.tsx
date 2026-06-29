"use client";
import React, { useState } from "react";
import { s, Workspace } from "./shared";

export function SetupWizard({ onDone }: { onDone: (ws: Workspace) => void }) {
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, anthropicKey: apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onDone(data.workspace);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        ...s.page,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ ...s.card, width: "100%", maxWidth: 420 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 600 }}>
          Set up your workspace
        </h1>
        <p style={{ margin: "0 0 1.25rem", fontSize: 13, color: "#9898A6" }}>
          Connect your Anthropic API key. It&apos;s encrypted before storage.
        </p>
        <form onSubmit={submit}>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={s.label}>Workspace name</label>
            <input
              style={s.input}
              placeholder="Acme Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={s.label}>Anthropic API key</label>
            <input
              style={{ ...s.input, ...s.mono }}
              placeholder="sk-ant-api03-…"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#56565F" }}>
              Get yours at console.anthropic.com
            </p>
          </div>
          {error && (
            <p
              style={{
                color: "#EF4444",
                fontSize: 12,
                background: "rgba(239,68,68,0.1)",
                padding: "8px 12px",
                borderRadius: 6,
                marginBottom: "0.75rem",
              }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            style={{ ...s.btnPrim, width: "100%" }}
            disabled={loading}
          >
            {loading ? "Validating key…" : "Create workspace →"}
          </button>
        </form>
      </div>
    </main>
  );
}
