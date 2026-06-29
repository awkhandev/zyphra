"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  StatCardSkeleton,
  ChartSkeleton,
  KeysTableSkeleton,
} from "@/components/Skeleton";
import {
  s,
  fmt,
  fmtT,
  ago,
  Workspace,
  KeySummary,
  Totals,
} from "@/components/dashboard/shared";
import { BudgetBar } from "@/components/dashboard/BudgetBar";
import { NewKeyModal } from "@/components/dashboard/NewKeyModal";
import { KeyRevealModal } from "@/components/dashboard/KeyRevealModal";
import { SetupWizard } from "@/components/dashboard/SetupWizard";
import { UsageChart } from "@/components/dashboard/UsageChart";
import { OpenAIKeySection } from "@/components/dashboard/OpenAIKeySection";
import { InviteSection } from "@/components/dashboard/InviteSection";
import { UpstreamKeyCard } from "@/components/dashboard/UpstreamKeyCard";
import { CacheSavingsCard } from "@/components/dashboard/CacheSavingsCard";
import { SmartRoutingCard } from "@/components/dashboard/SmartRoutingCard";
import { KeyPoolSection } from "@/components/dashboard/KeyPoolSection";

export default function DashboardPage() {
  const router = useRouter();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [keys, setKeys] = useState<KeySummary[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [workspaceTotal, setWorkspaceTotal] = useState<{
    totalRequests: number;
    totalTokens: number;
    totalCostUsd: number;
    cachedRequests: number;
    liveRequests: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [onboard, setOnboard] = useState(false);

  const loadUsage = useCallback(async (wsId: string) => {
    const res = await fetch(`/api/usage?workspaceId=${wsId}`);
    if (!res.ok) return;
    const data = await res.json();
    setKeys(data.summary ?? []);
    setTotals(data.totals ?? null);
    setWorkspaceTotal(data.workspaceTotal ?? null);
  }, []);

  useEffect(() => {
    async function init() {
      const { createBrowserSupabase } = await import("@/lib/supabase-browser");
      const supabase = createBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const res = await fetch("/api/workspace");
      const data = await res.json();
      if (!data.workspace) {
        setShowSetup(true);
        setLoading(false);
        return;
      }

      setWorkspace(data.workspace);
      await loadUsage(data.workspace.id);

      const dismissed = localStorage.getItem(`tk_onboard_${data.workspace.id}`);
      if (!dismissed) setOnboard(true);

      setLoading(false);
    }
    init();
  }, [router, loadUsage]);

  async function signOut() {
    const { createBrowserSupabase } = await import("@/lib/supabase-browser");
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/auth");
  }

  async function revokeKey(id: string) {
    if (
      !workspace ||
      !confirm("Revoke this key? It will stop working immediately.")
    )
      return;
    await fetch(`/api/keys?id=${id}&workspaceId=${workspace.id}`, {
      method: "DELETE",
    });
    await loadUsage(workspace.id);
  }

  if (showSetup)
    return (
      <SetupWizard
        onDone={(ws) => {
          setWorkspace(ws);
          setShowSetup(false);
          loadUsage(ws.id);
        }}
      />
    );

  if (loading)
    return (
      <main
        role="status"
        aria-live="polite"
        style={{ ...s.page, maxWidth: 1100, margin: "0 auto", padding: "2rem" }}
      >
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
        <ChartSkeleton />
        <div style={{ marginTop: "2rem" }}>
          <KeysTableSkeleton />
        </div>
      </main>
    );

  return (
    <ErrorBoundary>
      <main style={{ ...s.page, maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "#6366F1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 4h4v8H2V4zm5-2h2v12H7V2zm5 4h2v6h-2V6z"
                  fill="white"
                />
              </svg>
            </div>
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {workspace?.name}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#9898A6",
                background: "#18181C",
                padding: "2px 8px",
                borderRadius: 999,
                textTransform: "capitalize",
              }}
            >
              {workspace?.plan}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowModal(true)} style={s.btnPrim}>
              + New key
            </button>
            <a
              href="/dashboard/billing"
              style={{
                ...s.btnGhost,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Billing
            </a>
            <button onClick={signOut} style={s.btnGhost}>
              Sign out
            </button>
          </div>
        </header>

        {/* Onboarding guide */}
        {onboard && workspace && (
          <div
            style={{
              ...s.card,
              marginBottom: "2rem",
              background: "rgba(99,102,241,0.06)",
              border: "1px solid rgba(99,102,241,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#818CF8",
                }}
              >
                🚀 Quick setup guide
              </h2>
              <button
                onClick={() => {
                  if (workspace)
                    localStorage.setItem(`tk_onboard_${workspace.id}`, "1");
                  setOnboard(false);
                }}
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
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <span style={{ color: "#10B981", fontSize: 16, flexShrink: 0 }}>
                  ✅
                </span>
                <span style={{ color: "#F0F0F4" }}>
                  <strong>Workspace created</strong> — {workspace.name} is ready
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    color: keys.length > 0 ? "#10B981" : "#6366F1",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {keys.length > 0 ? "✅" : "🔑"}
                </span>
                <span style={{ color: "#F0F0F4", flex: 1 }}>
                  <strong>Create your first sub-key</strong>
                  {keys.length > 0
                    ? " — Done!"
                    : ' — Click "+ New key" above to get started'}
                </span>
                {keys.length === 0 && (
                  <button
                    onClick={() => setShowModal(true)}
                    style={{
                      ...s.btnPrim,
                      fontSize: 12,
                      padding: "6px 14px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Create key →
                  </button>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <span style={{ color: "#56565F", fontSize: 16, flexShrink: 0 }}>
                  ⚙️
                </span>
                <span style={{ color: "#9898A6", flex: 1 }}>
                  <strong>Add OpenAI key</strong> (optional) — Support GPT
                  models alongside Claude
                </span>
                <button
                  onClick={() => {
                    document
                      .getElementById("openai-section")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  style={{
                    ...s.btnGhost,
                    fontSize: 12,
                    padding: "5px 12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Setup →
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <span style={{ color: "#56565F", fontSize: 16, flexShrink: 0 }}>
                  💰
                </span>
                <span style={{ color: "#9898A6", flex: 1 }}>
                  <strong>Enable cost savings</strong> (optional) — Turn on
                  smart routing and prompt caching below
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    color: keys.length > 0 ? "#6366F1" : "#56565F",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  🚀
                </span>
                <span
                  style={{
                    color: keys.length > 0 ? "#F0F0F4" : "#9898A6",
                    flex: 1,
                  }}
                >
                  <strong>Point your tools here</strong> — Add to your
                  settings.json once you have a key
                </span>
              </div>
              {keys.length > 0 && (
                <div
                  style={{
                    background: "#18181C",
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginTop: 4,
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 6px",
                      fontSize: 11,
                      color: "#9898A6",
                    }}
                  >
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
  "ANTHROPIC_BASE_URL": "${typeof window !== "undefined" ? window.location.origin : "https://yourapp.vercel.app"}/api",
  "ANTHROPIC_AUTH_TOKEN": "zph_live_..."
}`}</pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stat cards */}
        {totals && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 12,
              marginBottom: "2rem",
            }}
          >
            {[
              {
                label: "Monthly requests",
                value: totals.totalRequests.toLocaleString(),
              },
              { label: "Monthly tokens", value: fmtT(totals.totalTokens) },
              { label: "Monthly cost", value: `$${fmt(totals.totalCostUsd)}` },
              {
                label: "Requests today",
                value: totals.dailyRequests.toLocaleString(),
              },
            ].map((c) => (
              <div key={c.label} style={{ ...s.card }}>
                <p
                  style={{ margin: "0 0 6px", fontSize: 12, color: "#9898A6" }}
                >
                  {c.label}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 26,
                    fontWeight: 600,
                    ...s.mono,
                  }}
                >
                  {c.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Keys table */}
        <div style={{ ...s.card, padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid #1E1E24",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
              Sub-keys
            </h2>
            <span style={{ fontSize: 12, color: "#56565F" }}>
              {keys.length} total
            </span>
          </div>
          {keys.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <p style={{ color: "#9898A6", marginBottom: "1rem" }}>
                No keys yet
              </p>
              <button onClick={() => setShowModal(true)} style={s.btnPrim}>
                Create your first key →
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Key",
                      "Status",
                      "Requests",
                      "Tokens",
                      "Cost",
                      "Budget",
                      "Today",
                      "Last used",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 16px",
                          textAlign: "left",
                          fontSize: 11,
                          color: "#56565F",
                          fontWeight: 500,
                          borderBottom: "1px solid #1E1E24",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr
                      key={k.sub_key_id}
                      style={{ borderBottom: "1px solid #1E1E2480" }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <p style={{ margin: "0 0 3px", fontWeight: 500 }}>
                          {k.label}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 11,
                            color: "#9898A6",
                            ...s.mono,
                          }}
                        >
                          {k.key_prefix}…
                        </p>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: k.is_active
                              ? "rgba(16,185,129,0.15)"
                              : "rgba(239,68,68,0.12)",
                            color: k.is_active ? "#10B981" : "#EF4444",
                          }}
                        >
                          {k.is_active ? "Active" : "Revoked"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          ...s.mono,
                          color: "#9898A6",
                        }}
                      >
                        {k.request_count.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          ...s.mono,
                          color: "#9898A6",
                        }}
                      >
                        {fmtT(k.total_tokens)}
                      </td>
                      <td style={{ padding: "12px 16px", ...s.mono }}>
                        ${fmt(k.cost_usd, 4)}
                      </td>
                      <td style={{ padding: "12px 16px", minWidth: 130 }}>
                        <BudgetBar
                          spent={k.cost_usd}
                          budget={k.monthly_budget_usd}
                        />
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          ...s.mono,
                          color: "#9898A6",
                        }}
                      >
                        {k.daily_requests.toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          fontSize: 12,
                          color: "#56565F",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {ago(k.last_used_at)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {k.is_active && (
                          <button
                            onClick={() => revokeKey(k.sub_key_id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#EF4444",
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <UpstreamKeyCard
          workspace={workspace}
          totalUsage={workspaceTotal}
          keys={keys}
        />

        {workspace && <UsageChart workspaceId={workspace.id} />}
        {workspace && <CacheSavingsCard workspaceId={workspace.id} />}
        {workspace && <SmartRoutingCard workspaceId={workspace.id} />}
        {workspace && <KeyPoolSection workspaceId={workspace.id} />}
        <div id="openai-section">{workspace && <OpenAIKeySection />}</div>
        {workspace && <InviteSection workspaceId={workspace.id} />}

        {showModal && workspace && (
          <NewKeyModal
            workspaceId={workspace.id}
            onClose={() => setShowModal(false)}
            onCreated={(raw) => {
              setShowModal(false);
              setNewKey(raw);
              loadUsage(workspace.id).then(() => {
                if (workspace) {
                  setOnboard(false);
                  localStorage.setItem(`tk_onboard_${workspace.id}`, "1");
                }
              });
            }}
          />
        )}
        {newKey && (
          <KeyRevealModal rawKey={newKey} onClose={() => setNewKey(null)} />
        )}
      </main>
    </ErrorBoundary>
  );
}
