"use client";
import React, { useState } from "react";
import { s } from "./shared";

export function NewKeyModal({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  onClose: () => void;
  onCreated: (raw: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [budget, setBudget] = useState("");
  const [limit, setLimit] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          label,
          monthlyBudgetUsd: budget ? parseFloat(budget) : undefined,
          dailyRequestLimit: limit ? parseInt(limit) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgradeNeeded) {
          throw new Error(
            `${data.error} — ${data.detail} Upgrade your plan to add more keys.`,
          );
        }
        throw new Error(data.error);
      }
      onCreated(data.key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create new sub-key"
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
      <div style={{ ...s.card, width: "100%", maxWidth: 420 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            New sub-key
          </h2>
          <button
            onClick={onClose}
            aria-label="Close new sub-key dialog"
            style={{
              background: "none",
              border: "none",
              color: "#9898A6",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
        <form onSubmit={submit}>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={s.label}>Label</label>
            <input
              style={s.input}
              placeholder="e.g. Alice (backend) or Project: Search"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: "1rem",
            }}
          >
            <div>
              <label style={s.label}>Monthly budget (USD)</label>
              <input
                style={s.input}
                type="number"
                min="0"
                step="0.01"
                placeholder="No limit"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <div>
              <label style={s.label}>Daily request limit</label>
              <input
                style={s.input}
                type="number"
                min="1"
                placeholder="No limit"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <p
              style={{
                color: "#EF4444",
                fontSize: 12,
                marginBottom: "0.75rem",
              }}
            >
              {error}
            </p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ ...s.btnGhost, flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ ...s.btnPrim, flex: 1 }}
              disabled={loading}
            >
              {loading ? "Creating…" : "Create key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
