"use client";
import React from "react";
import { s } from "./shared";

export function OpenAIKeySection() {
  const [configured, setConfigured] = React.useState<boolean | null>(null);
  const [key, setKey] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  React.useEffect(() => {
    fetch("/api/workspace/openai")
      .then((r) => r.json())
      .then((d) => setConfigured(d.configured ?? false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/workspace/openai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ openaiKey: key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfigured(true);
      setKey("");
      setResult({
        ok: true,
        msg: "OpenAI key saved. Your sub-keys now work with GPT models too.",
      });
    } catch (err) {
      setResult({
        ok: false,
        msg: err instanceof Error ? err.message : "Failed",
      });
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (
      !confirm(
        "Remove OpenAI key? Your sub-keys will stop working with GPT models.",
      )
    )
      return;
    setLoading(true);
    await fetch("/api/workspace/openai", { method: "DELETE" });
    setConfigured(false);
    setLoading(false);
    setResult({ ok: true, msg: "OpenAI key removed." });
  }

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
            OpenAI support
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: "#9898A6" }}>
            Add your OpenAI key so sub-keys also work with GPT models.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              padding: "3px 10px",
              borderRadius: 999,
              background: configured
                ? "rgba(16,185,129,0.15)"
                : "rgba(88,88,95,0.2)",
              color: configured ? "#10B981" : "#9898A6",
            }}
          >
            {configured === null
              ? "…"
              : configured
                ? "✓ Connected"
                : "Not configured"}
          </span>
        </div>
      </div>

      {configured ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#18181C",
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 13 }}>
              OpenAI key is saved and encrypted
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#9898A6" }}>
              Proxy URL:{" "}
              <span style={{ fontFamily: "monospace" }}>
                {typeof window !== "undefined" ? window.location.origin : ""}
                /api/openai
              </span>
            </p>
          </div>
          <button
            onClick={remove}
            disabled={loading}
            style={{
              background: "none",
              border: "1px solid #1E1E24",
              color: "#EF4444",
              fontSize: 12,
              padding: "5px 12px",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Remove
          </button>
        </div>
      ) : (
        <form onSubmit={save} style={{ display: "flex", gap: 8 }}>
          <input
            type="password"
            placeholder="sk-proj-..."
            required
            value={key}
            onChange={(e) => setKey(e.target.value)}
            style={{
              ...s.input,
              flex: 1,
              fontFamily: "monospace",
              fontSize: 13,
            }}
          />
          <button type="submit" style={s.btnPrim} disabled={loading}>
            {loading ? "Validating…" : "Save key"}
          </button>
        </form>
      )}

      {result && (
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 12,
            color: result.ok ? "#10B981" : "#EF4444",
          }}
        >
          {result.msg}
        </p>
      )}

      {configured && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            background: "rgba(99,102,241,0.08)",
            borderRadius: 8,
            border: "1px solid rgba(99,102,241,0.2)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#9898A6",
              lineHeight: 1.6,
            }}
          >
            💡 Tell your team to use their existing{" "}
            <span style={{ fontFamily: "monospace", color: "#818CF8" }}>
              zph_live_
            </span>{" "}
            key with any OpenAI-compatible tool: set{" "}
            <span style={{ fontFamily: "monospace", color: "#818CF8" }}>
              OPENAI_BASE_URL
            </span>{" "}
            to your proxy URL above.
          </p>
        </div>
      )}
    </div>
  );
}
