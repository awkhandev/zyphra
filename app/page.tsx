import Link from "next/link";
import type { Metadata } from "next";

const features = [
  {
    icon: "🔑",
    title: "Sub-keys per developer",
    desc: "Issue each developer or project their own key. One master key, full individual control. Revoke any key instantly without touching the others.",
  },
  {
    icon: "💰",
    title: "Hard budget enforcement",
    desc: "Set monthly spend limits per key. When a developer hits their budget, requests stop — no overages, no surprise bills, no Friday night incidents.",
  },
  {
    icon: "🔔",
    title: "Email alerts at 80% and 100%",
    desc: "Get notified before the limit hits. Your team keeps working, you stay informed. No more checking dashboards manually.",
  },
  {
    icon: "📊",
    title: "Real-time usage tracking",
    desc: "See exactly which developer, project, or feature spent what. Token counts, request counts, and cost — updated after every request.",
  },
  {
    icon: "🧠",
    title: "Smart model routing",
    desc: "Simple prompts automatically route to cheaper models (Haiku, GPT-4o-mini). Complex prompts stay on the model you asked for. Saves 50-80% on easy requests.",
  },
  {
    icon: "⚡",
    title: "Prompt caching",
    desc: "Identical non-streaming requests are served from cache instantly. Saves 100% of API cost on repeated prompts. Zero config — just enable it.",
  },
  {
    icon: "⚖️",
    title: "Key pool load balancing",
    desc: "Add multiple API keys per provider. Requests auto-distribute. If one key hits a rate limit, the next one picks up automatically.",
  },
  {
    icon: "🔀",
    title: "Anthropic + OpenAI in one key",
    desc: "One Zyphra sub-key works with both Claude and GPT models. Your team uses the same key for everything — no provider switching.",
  },
  {
    icon: "🔒",
    title: "Master key never exposed",
    desc: "Your API keys are encrypted with AES-256 and never leave your server. Developers only ever see their sub-key.",
  },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    highlight: false,
    features: [
      "3 sub-keys",
      "Basic dashboard",
      "Usage tracking",
      "Community support",
    ],
    cta: "Get started free",
  },
  {
    name: "Starter",
    price: "$19",
    period: "/month",
    highlight: false,
    features: [
      "10 sub-keys",
      "Email alerts",
      "Budget enforcement",
      "30-day history",
    ],
    cta: "Start free trial",
  },
  {
    name: "Team",
    price: "$49",
    period: "/month",
    highlight: true,
    features: [
      "25 sub-keys",
      "Email alerts (unlimited)",
      "Project-level keys",
      "Priority support",
    ],
    cta: "Start free trial",
  },
  {
    name: "Business",
    price: "$99",
    period: "/month",
    highlight: false,
    features: [
      "Unlimited keys",
      "SSO / Google login",
      "Audit logs",
      "Dedicated support",
    ],
    cta: "Contact us",
  },
];

const pageMetadata: Metadata = {
  title: "Zyphra — AI API Billing & Key Management for Teams",
  description:
    "Manage Anthropic and OpenAI API keys for your development team with per-developer budgets, usage tracking, smart routing, and prompt caching. Cut AI costs by 50-90%.",
  openGraph: {
    title: "Zyphra — AI API Billing & Key Management for Teams",
    description:
      "Manage Anthropic and OpenAI API keys for your development team with per-developer budgets, usage tracking, smart routing, and prompt caching.",
    url: "https://zyphra.vercel.app",
    siteName: "Zyphra",
    type: "website",
  },
};

export const metadata: Metadata = pageMetadata;

export default function LandingPage() {
  return (
    <main
      style={{
        background: "#0A0A0B",
        color: "#F0F0F4",
        fontFamily: "Inter,system-ui,sans-serif",
        minHeight: "100vh",
      }}
    >
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 2rem",
          borderBottom: "1px solid #1E1E24",
          position: "sticky",
          top: 0,
          background: "rgba(10,10,11,0.9)",
          backdropFilter: "blur(12px)",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              background: "#6366F1",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>
              T
            </span>
          </div>
          <span
            style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}
          >
            Zyphra
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/auth"
            style={{
              color: "#9898A6",
              textDecoration: "none",
              fontSize: 14,
              padding: "6px 14px",
              borderRadius: 7,
              border: "1px solid #1E1E24",
              transition: "all 0.15s",
            }}
          >
            Log in
          </Link>
          <Link
            href="/auth"
            style={{
              background: "#6366F1",
              color: "white",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
              padding: "8px 18px",
              borderRadius: 7,
            }}
          >
            Get started free →
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        style={{
          textAlign: "center",
          padding: "6rem 2rem 5rem",
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 999,
            padding: "4px 14px",
            fontSize: 12,
            color: "#818CF8",
            fontWeight: 500,
            marginBottom: "1.5rem",
            letterSpacing: "0.03em",
          }}
        >
          AI API billing for teams
        </div>

        <h1
          style={{
            fontSize: "clamp(2.2rem,5vw,3.5rem)",
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            margin: "0 0 1.5rem",
            color: "#F0F0F4",
          }}
        >
          Cut your team&apos;s AI bills
          <br />
          <span style={{ color: "#6366F1" }}>by 50-90%</span>
        </h1>

        <p
          style={{
            fontSize: "1.125rem",
            color: "#9898A6",
            lineHeight: 1.7,
            maxWidth: 560,
            margin: "0 auto 2.5rem",
          }}
        >
          Zyphra sits between your team and Anthropic/OpenAI&apos;s APIs. Smart
          routing, prompt caching, per-developer budgets — all in one proxy.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/auth"
            style={{
              background: "#6366F1",
              color: "white",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 15,
              padding: "13px 28px",
              borderRadius: 9,
            }}
          >
            Start free — 3 keys included
          </Link>
          <a
            href="#how-it-works"
            aria-label="See how Zyphra works"
            style={{
              background: "transparent",
              color: "#9898A6",
              textDecoration: "none",
              fontSize: 15,
              padding: "13px 28px",
              borderRadius: 9,
              border: "1px solid #1E1E24",
            }}
          >
            See how it works ↓
          </a>
        </div>

        {/* Social proof */}
        <p style={{ marginTop: "2rem", fontSize: 13, color: "#56565F" }}>
          No credit card required · Deploy in 5 minutes · Your keys stay
          encrypted
        </p>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{
          padding: "4rem 2rem",
          borderTop: "1px solid #1E1E24",
          background: "#0D0D0F",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              marginBottom: "0.75rem",
              letterSpacing: "-0.02em",
            }}
          >
            Setup in 4 steps
          </h2>
          <p style={{ color: "#9898A6", marginBottom: "3rem", fontSize: 15 }}>
            No infrastructure. No SDK changes. Just swap one URL.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 20,
              textAlign: "left",
            }}
          >
            {[
              {
                n: "01",
                title: "Connect your keys",
                desc: "Paste your Anthropic and/or OpenAI API keys. We encrypt them with AES-256. You're the only one who can use them.",
              },
              {
                n: "02",
                title: "Issue sub-keys",
                desc: "Create a key per developer. Set monthly budgets and daily limits. They use their key exactly like a real API key.",
              },
              {
                n: "03",
                title: "Point your tools here",
                desc: "Add two env vars — ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN. Works with Claude Code, Cursor, Cline, and more.",
              },
              {
                n: "04",
                title: "Watch the savings",
                desc: "Smart routing, prompt caching, and load balancing kick in automatically. See real savings on your dashboard.",
              },
            ].map((s) => (
              <div
                key={s.n}
                style={{
                  background: "#111113",
                  border: "1px solid #1E1E24",
                  borderRadius: 12,
                  padding: "1.5rem",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "#6366F1",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    marginBottom: 12,
                  }}
                >
                  {s.n}
                </div>
                <h3
                  style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    color: "#9898A6",
                    fontSize: 12,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section
        style={{ padding: "5rem 2rem", maxWidth: 1000, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: "0 0 0.75rem",
            }}
          >
            Everything your team needs
          </h2>
          <p style={{ color: "#9898A6", fontSize: 15 }}>
            Built for engineering managers who got tired of surprise AI bills.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
            gap: 20,
          }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: "#111113",
                border: "1px solid #1E1E24",
                borderRadius: 12,
                padding: "1.5rem",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>
                {f.title}
              </h3>
              <p
                style={{
                  color: "#9898A6",
                  fontSize: 13,
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "5rem 2rem",
          background: "#0D0D0F",
          borderTop: "1px solid #1E1E24",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                margin: "0 0 0.75rem",
              }}
            >
              Simple, transparent pricing
            </h2>
            <p style={{ color: "#9898A6", fontSize: 15 }}>
              Start free. Upgrade when your team grows.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))",
              gap: 20,
              alignItems: "stretch",
            }}
          >
            {plans.map((p) => (
              <div
                key={p.name}
                style={{
                  background: p.highlight ? "rgba(99,102,241,0.08)" : "#111113",
                  border: p.highlight
                    ? "2px solid #6366F1"
                    : "1px solid #1E1E24",
                  borderRadius: 14,
                  padding: "1.75rem",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                }}
              >
                {p.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#6366F1",
                      color: "white",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 12px",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Most popular
                  </div>
                )}
                <div style={{ marginBottom: "auto" }}>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      margin: "0 0 8px",
                      color: p.highlight ? "#818CF8" : "#9898A6",
                    }}
                  >
                    {p.name}
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 4,
                      marginBottom: "1.25rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: 700,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {p.price}
                    </span>
                    <span style={{ fontSize: 13, color: "#9898A6" }}>
                      {p.period}
                    </span>
                  </div>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: "0 0 1.5rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {p.features.map((f) => (
                      <li
                        key={f}
                        style={{
                          fontSize: 13,
                          color: "#9898A6",
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                        }}
                      >
                        <span style={{ color: "#10B981", flexShrink: 0 }}>
                          ✓
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/auth"
                  style={{
                    display: "block",
                    textAlign: "center",
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 500,
                    padding: "10px 0",
                    borderRadius: 8,
                    background: p.highlight ? "#6366F1" : "transparent",
                    color: p.highlight ? "white" : "#9898A6",
                    border: p.highlight ? "none" : "1px solid #1E1E24",
                  }}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section style={{ padding: "6rem 2rem", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              margin: "0 0 1rem",
            }}
          >
            Stop sharing one API key across your whole team
          </h2>
          <p
            style={{
              color: "#9898A6",
              fontSize: 15,
              lineHeight: 1.7,
              marginBottom: "2rem",
            }}
          >
            It takes 5 minutes to set up. A team spending $3K/mo on AI APIs
            typically saves $1,200/mo with smart routing and caching. Zyphra
            costs $49/mo.
          </p>
          <Link
            href="/auth"
            style={{
              display: "inline-block",
              background: "#6366F1",
              color: "white",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 15,
              padding: "13px 32px",
              borderRadius: 9,
            }}
          >
            Get started free →
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid #1E1E24",
          padding: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              background: "#6366F1",
              borderRadius: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "white", fontWeight: 700, fontSize: 11 }}>
              T
            </span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Zyphra</span>
        </div>
        <p style={{ color: "#56565F", fontSize: 12, margin: 0 }}>
          © 2026 Zyphra. AI API billing for teams.
        </p>
        <div style={{ display: "flex", gap: 20 }}>
          {[
            { label: "Docs", href: "/docs" },
            { label: "Privacy", href: "#" },
            { label: "Terms", href: "#" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              style={{ color: "#56565F", textDecoration: "none", fontSize: 13 }}
            >
              {l.label}
            </a>
          ))}
        </div>
      </footer>
    </main>
  );
}
