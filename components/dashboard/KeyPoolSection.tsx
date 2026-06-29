"use client";
import React from "react";
import { s, ago } from "./shared";

type PoolKey = {
  id: string;
  provider: string;
  label: string;
  priority: number;
  is_active: boolean;
  requests_today: number;
  daily_limit: number | null;
  rate_limited_until: string | null;
  last_used_at: string | null;
  created_at: string;
};

export function KeyPoolSection({ workspaceId }: { workspaceId: string }) {
  const [keys, setKeys] = React.useState<PoolKey[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAdd, setShowAdd] = React.useState(false);
  const [provider, setProvider] = React.useState<"anthropic" | "openai">(
    "anthropic",
  );
  const [keyInput, setKeyInput] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [priority, setPriority] = React.useState("0");
  const [adding, setAdding] = React.useState(false);
  const [error, setError] = React.useState("");

  const loadKeys = React.useCallback(() => {
    fetch(`/api/workspace/keypool?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => {
        setKeys(d.keys ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [workspaceId]);

  React.useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  async function addKey(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/workspace/keypool", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          provider,
          apiKey: keyInput,
          label: label || `Key ${keys.length + 1}`,
          priority: parseInt(priority) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowAdd(false);
      setKeyInput("");
      setLabel("");
      setPriority("0");
      loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAdding(false);
    }
  }

  async function removeKey(id: string) {
    if (!confirm("Remove this key from the pool?")) return;
    await fetch(`/api/workspace/keypool?id=${id}&workspaceId=${workspaceId}`, {
      method: "DELETE",
    });
    loadKeys();
  }

  const isLimited = (k: PoolKey) =>
    k.rate_limited_until && new Date(k.rate_limited_until) > new Date();

  return (
    <div style={{ ...s.card, marginTop: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 500 }}>
            API Key Pool
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: "#9898A6" }}>
            Add multiple API keys per provider. Requests auto-distribute, retry
            on 429.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ ...s.btnPrim, fontSize: 12, padding: "6px 14px" }}
        >
          {showAdd ? "Cancel" : "+ Add key"}
        </button>
      </div>

      {showAdd && (
        <form
          onSubmit={addKey}
          style={{
            background: "#18181C",
            borderRadius: 8,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div>
              <label style={s.label}>Provider</label>
              <select
                value={provider}
                onChange={(e) =>
                  setProvider(e.target.value as "anthropic" | "openai")
                }
                style={{ ...s.input, fontSize: 12 }}
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            <div>
              <label style={s.label}>Label</label>
              <input
                style={s.input}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={`Key ${keys.length + 1}`}
              />
            </div>
            <div>
              <label style={s.label}>Priority (lower = first)</label>
              <input
                style={s.input}
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                min="0"
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="password"
              style={{ ...s.input, flex: 1 }}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder={
                provider === "anthropic" ? "sk-ant-api03-..." : "sk-proj-..."
              }
              required
            />
            <button
              type="submit"
              style={{ ...s.btnPrim, fontSize: 12, padding: "8px 16px" }}
              disabled={adding}
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
          {error && (
            <p style={{ color: "#EF4444", fontSize: 12, margin: "8px 0 0" }}>
              {error}
            </p>
          )}
        </form>
      )}

      {!loading && keys.length === 0 && (
        <div
          style={{
            padding: "1.5rem",
            textAlign: "center",
            color: "#56565F",
            fontSize: 13,
          }}
        >
          No keys in pool — using workspace default key
        </div>
      )}

      {!loading && keys.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
          >
            <thead>
              <tr>
                {[
                  "Label",
                  "Provider",
                  "Priority",
                  "Status",
                  "Requests",
                  "Last used",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
                      textAlign: "left",
                      fontSize: 11,
                      color: "#56565F",
                      fontWeight: 500,
                      borderBottom: "1px solid #1E1E24",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} style={{ borderBottom: "1px solid #1E1E2480" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                    {k.label}
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      textTransform: "capitalize",
                    }}
                  >
                    {k.provider}
                  </td>
                  <td style={{ padding: "10px 12px", ...s.mono }}>
                    {k.priority}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: isLimited(k)
                          ? "rgba(245,158,11,0.15)"
                          : k.is_active
                            ? "rgba(16,185,129,0.15)"
                            : "rgba(88,88,95,0.2)",
                        color: isLimited(k)
                          ? "#F59E0B"
                          : k.is_active
                            ? "#10B981"
                            : "#9898A6",
                      }}
                    >
                      {isLimited(k)
                        ? "Rate limited"
                        : k.is_active
                          ? "Active"
                          : "Disabled"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "10px 12px",
                      ...s.mono,
                      color: "#9898A6",
                    }}
                  >
                    {k.requests_today.toLocaleString()}
                    {k.daily_limit ? ` / ${k.daily_limit}` : ""}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#56565F" }}>
                    {ago(k.last_used_at)}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <button
                      onClick={() => removeKey(k.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#EF4444",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
