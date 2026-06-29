"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS, type PlanName } from "@/lib/payments";

type Workspace = { id: string; name: string; plan: string };

const planOrder: PlanName[] = ["free", "starter", "team", "business"];

export default function BillingPage() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/workspace")
      .then((r) => r.json())
      .then((d) => {
        if (!d.workspace) {
          router.push("/auth");
          return;
        }
        setWorkspace(d.workspace);
        setLoading(false);
      });
  }, [router]);

  async function upgrade(plan: PlanName) {
    if (plan === "free") return;
    setUpgrading(plan);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setUpgrading(null);
    }
  }

  async function manageSubscription() {
    setManaging(true);
    setError("");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setManaging(false);
    }
  }

  if (loading)
    return (
      <main
        style={{
          background: "#0A0A0B",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter,system-ui,sans-serif",
        }}
      >
        <p style={{ color: "#9898A6" }}>Loading…</p>
      </main>
    );

  const currentPlan = (workspace?.plan ?? "free") as PlanName;
  const currentIdx = planOrder.indexOf(currentPlan);

  return (
    <main
      style={{
        background: "#0A0A0B",
        minHeight: "100vh",
        color: "#F0F0F4",
        fontFamily: "Inter,system-ui,sans-serif",
        padding: "1.5rem",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: "2rem",
          }}
        >
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              background: "none",
              border: "1px solid #1E1E24",
              color: "#9898A6",
              borderRadius: 7,
              padding: "6px 14px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ← Dashboard
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            Billing & Plan
          </h1>
        </div>

        {/* Current plan banner */}
        <div
          style={{
            background: "#111113",
            border: "1px solid #1E1E24",
            borderRadius: 12,
            padding: "1.5rem",
            marginBottom: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 13, color: "#9898A6" }}>
              Current plan
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 700 }}>
                {PLANS[currentPlan].name}
              </span>
              <span
                style={{
                  fontSize: 12,
                  background: "rgba(99,102,241,0.15)",
                  color: "#818CF8",
                  padding: "2px 10px",
                  borderRadius: 999,
                  fontWeight: 500,
                }}
              >
                {currentPlan === "free"
                  ? "Free forever"
                  : `$${PLANS[currentPlan].price}/mo`}
              </span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#9898A6" }}>
              {PLANS[currentPlan].maxKeys === 999999
                ? "Unlimited sub-keys"
                : `Up to ${PLANS[currentPlan].maxKeys} sub-keys`}
            </p>
          </div>
          {currentPlan !== "free" && (
            <button
              onClick={manageSubscription}
              disabled={managing}
              style={{
                background: "transparent",
                border: "1px solid #1E1E24",
                color: "#9898A6",
                padding: "9px 18px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {managing ? "Opening…" : "Manage subscription →"}
            </button>
          )}
        </div>

        {error && (
          <p
            style={{
              color: "#EF4444",
              background: "rgba(239,68,68,0.1)",
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              marginBottom: "1rem",
            }}
          >
            {error}
          </p>
        )}

        {/* Plan cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
            gap: 16,
          }}
        >
          {planOrder.map((plan, idx) => {
            const cfg = PLANS[plan];
            const isCurrent = plan === currentPlan;
            const isUpgrade = idx > currentIdx;
            const isLoading = upgrading === plan;

            return (
              <div
                key={plan}
                style={{
                  background: isCurrent ? "rgba(99,102,241,0.08)" : "#111113",
                  border: isCurrent ? "2px solid #6366F1" : "1px solid #1E1E24",
                  borderRadius: 12,
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: isCurrent ? "#818CF8" : "#9898A6",
                  }}
                >
                  {cfg.name}
                </p>
                <p
                  style={{
                    margin: "0 0 16px",
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {cfg.price === 0 ? "Free" : `$${cfg.price}`}
                  {cfg.price > 0 && (
                    <span
                      style={{
                        fontSize: 13,
                        color: "#9898A6",
                        fontWeight: 400,
                      }}
                    >
                      /mo
                    </span>
                  )}
                </p>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "0 0 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 7,
                    flex: 1,
                  }}
                >
                  {cfg.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        fontSize: 12,
                        color: "#9898A6",
                        display: "flex",
                        gap: 7,
                      }}
                    >
                      <span style={{ color: "#10B981" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      color: "#6366F1",
                      fontWeight: 600,
                      padding: "9px 0",
                    }}
                  >
                    Current plan
                  </div>
                ) : isUpgrade ? (
                  <button
                    onClick={() => upgrade(plan)}
                    disabled={!!upgrading}
                    style={{
                      background: "#6366F1",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 0",
                      fontWeight: 500,
                      fontSize: 13,
                      cursor: upgrading ? "not-allowed" : "pointer",
                      opacity: upgrading && !isLoading ? 0.5 : 1,
                    }}
                  >
                    {isLoading ? "Redirecting…" : `Upgrade to ${cfg.name}`}
                  </button>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      fontSize: 12,
                      color: "#56565F",
                      padding: "9px 0",
                    }}
                  >
                    Lower plan
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p
          style={{
            marginTop: "1.5rem",
            fontSize: 12,
            color: "#56565F",
            textAlign: "center",
          }}
        >
          Payments are secure. Cancel anytime. No questions asked.
        </p>
      </div>
    </main>
  );
}
