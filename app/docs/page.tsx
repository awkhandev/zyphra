"use client";
/* ── Zyphra API Documentation ──────────────────────────────────────────── */
/* Dark theme matches the rest of the app.                                   */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://zyphra.vercel.app";

// ── Sidebar sections ──────────────────────────────────────────────────────────
const sections = [
  { id: "quickstart", title: "Quick Start" },
  { id: "auth", title: "Authentication" },
  { id: "anthropic", title: "Anthropic Proxy" },
  { id: "openai", title: "OpenAI Proxy" },
  { id: "claude-code", title: "Claude Code Setup" },
  { id: "tools", title: "Cursor / Windsurf / Cline" },
  { id: "headers", title: "Response Headers" },
  { id: "features", title: "Features" },
  { id: "errors", title: "Error Codes" },
  { id: "limits", title: "Rate Limits" },
];

// ── Reusable styles ──────────────────────────────────────────────────────────
const c = {
  page: {
    display: "flex",
    minHeight: "100vh",
    background: "#0A0A0B",
    color: "#F0F0F4",
    fontFamily: "Inter,system-ui,sans-serif",
  },
  sidebar: {
    width: 240,
    flexShrink: 0,
    padding: "2rem 1.5rem",
    borderRight: "1px solid #1E1E24",
    position: "sticky" as const,
    top: 0,
    height: "100vh",
    overflowY: "auto" as const,
  },
  main: {
    flex: 1,
    maxWidth: 780,
    padding: "2.5rem 3rem",
    overflowX: "hidden" as const,
  },
  h1: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "-0.03em",
    margin: "0 0 0.5rem",
  },
  h2: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    margin: "2.5rem 0 0.75rem",
    paddingBottom: 8,
    borderBottom: "1px solid #1E1E24",
  },
  h3: { fontSize: 15, fontWeight: 600, margin: "1.5rem 0 0.5rem" },
  p: { fontSize: 14, color: "#9898A6", lineHeight: 1.7, margin: "0 0 1rem" },
  code: {
    background: "#18181C",
    border: "1px solid #1E1E24",
    borderRadius: 7,
    padding: "2px 6px",
    fontSize: 13,
    fontFamily: "JetBrains Mono, monospace",
    color: "#818CF8",
  },
  pre: {
    background: "#18181C",
    border: "1px solid #1E1E24",
    borderRadius: 10,
    padding: "1rem 1.25rem",
    overflow: "auto",
    fontSize: 12,
    fontFamily: "JetBrains Mono, monospace",
    color: "#F0F0F4",
    lineHeight: 1.6,
    margin: "0 0 1rem",
  },
  link: { color: "#6366F1", textDecoration: "none" },
  tag: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 500,
    padding: "2px 8px",
    borderRadius: 999,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 13,
    margin: "0 0 1.5rem",
  },
  th: {
    padding: "8px 12px",
    textAlign: "left" as const,
    fontSize: 11,
    color: "#56565F",
    fontWeight: 500,
    borderBottom: "1px solid #1E1E24",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #1E1E2440",
    color: "#9898A6",
  },
  tip: {
    background: "rgba(99,102,241,0.08)",
    border: "1px solid rgba(99,102,241,0.25)",
    borderRadius: 10,
    padding: "1rem 1.25rem",
    margin: "0 0 1.5rem",
  },
  warn: {
    background: "rgba(245,158,11,0.08)",
    border: "1px solid rgba(245,158,11,0.25)",
    borderRadius: 10,
    padding: "1rem 1.25rem",
    margin: "0 0 1.5rem",
  },
};

function Code({ children }: { children: string }) {
  return <code style={c.code}>{children}</code>;
}

function Pre({ children, label }: { children: string; label?: string }) {
  return (
    <div style={{ position: "relative", margin: "0 0 1rem" }}>
      {label && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 12,
            fontSize: 10,
            color: "#56565F",
            fontFamily: "JetBrains Mono, monospace",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </div>
      )}
      <pre style={c.pre}>{children}</pre>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div style={c.tip}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{children}</p>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div style={c.warn}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#F59E0B" }}>
        {children}
      </p>
    </div>
  );
}

// ── Page component ────────────────────────────────────────────────────────────
export default function DocsPage() {
  return (
    <div style={c.page}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <nav style={c.sidebar}>
        <a
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              background: "#6366F1",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "white", fontWeight: 700, fontSize: 13 }}>
              T
            </span>
          </div>
          <span style={{ color: "#F0F0F4", fontWeight: 600, fontSize: 15 }}>
            Zyphra
          </span>
        </a>
        <p
          style={{
            fontSize: 11,
            color: "#56565F",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 600,
            margin: "0 0 12px",
          }}
        >
          Documentation
        </p>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                style={{
                  display: "block",
                  fontSize: 13,
                  color: "#9898A6",
                  textDecoration: "none",
                  padding: "5px 8px",
                  borderRadius: 6,
                  transition: "all 0.15s",
                }}
                className="docs-sidebar-link"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
        <div
          style={{
            marginTop: "2rem",
            paddingTop: "1rem",
            borderTop: "1px solid #1E1E24",
          }}
        >
          <a
            href="/dashboard"
            style={{
              display: "block",
              fontSize: 13,
              color: "#6366F1",
              textDecoration: "none",
              padding: "5px 8px",
            }}
          >
            ← Back to Dashboard
          </a>
        </div>
      </nav>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div style={c.main}>
        <h1 style={c.h1}>Zyphra API Documentation</h1>
        <p
          style={{ ...c.p, fontSize: 15, color: "#F0F0F4", margin: "0 0 2rem" }}
        >
          One sub-key for both Anthropic and OpenAI. Zero code changes.
        </p>

        {/* ── Quick Start ──────────────────────────────────────────────── */}
        <section id="quickstart">
          <h2 style={c.h2}>Quick Start</h2>
          <p style={c.p}>
            Zyphra sits between your tools and the AI APIs. You get a single
            sub-key (<Code>zph_live_...</Code>) that works with both Claude and
            GPT models.
          </p>
          <ol
            style={{
              fontSize: 14,
              color: "#9898A6",
              lineHeight: 2,
              paddingLeft: 20,
              margin: "0 0 1.5rem",
            }}
          >
            <li>
              Sign up at{" "}
              <a href="/auth" style={c.link}>
                zyphra.vercel.app/auth
              </a>
            </li>
            <li>
              Create a workspace and paste your Anthropic and/or OpenAI API key
            </li>
            <li>Create a sub-key in the dashboard</li>
            <li>Point your tools at the Zyphra proxy URL</li>
          </ol>
          <Tip>
            💡 <strong>No SDK changes needed.</strong> Just swap two environment
            variables and everything works as-is.
          </Tip>
        </section>

        {/* ── Authentication ────────────────────────────────────────────── */}
        <section id="auth">
          <h2 style={c.h2}>Authentication</h2>
          <p style={c.p}>
            Every request must include your Zyphra sub-key. Sub-keys start with{" "}
            <Code>zph_live_</Code> followed by 32 random characters.
          </p>
          <h3 style={c.h3}>Anthropic-style (x-api-key header)</h3>
          <Pre label="header">{"x-api-key: zph_live_abc123def456..."}</Pre>
          <h3 style={c.h3}>OpenAI-style (Authorization header)</h3>
          <Pre label="header">
            {"Authorization: Bearer zph_live_abc123def456..."}
          </Pre>
          <Tip>
            💡 Both formats work on both proxies. If your tool sends{" "}
            <Code>x-api-key</Code>, use the Anthropic endpoint. If it sends{" "}
            <Code>Authorization: Bearer</Code>, use the OpenAI endpoint.
          </Tip>
        </section>

        {/* ── Anthropic Proxy ───────────────────────────────────────────── */}
        <section id="anthropic">
          <h2 style={c.h2}>Anthropic Proxy</h2>
          <p style={c.p}>
            Replace <Code>https://api.anthropic.com</Code> with:
          </p>
          <Pre label="url">{`${APP_URL}/api`}</Pre>
          <h3 style={c.h3}>Supported endpoints</h3>
          <table style={c.table}>
            <thead>
              <tr>
                <th style={c.th}>Method</th>
                <th style={c.th}>Path</th>
                <th style={c.th}>Streaming</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={c.td}>
                  <span
                    style={{
                      ...c.tag,
                      background: "rgba(16,185,129,0.15)",
                      color: "#10B981",
                    }}
                  >
                    POST
                  </span>
                </td>
                <td
                  style={{
                    ...c.td,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 12,
                  }}
                >
                  /v1/messages
                </td>
                <td style={c.td}>✅ Yes (SSE)</td>
              </tr>
            </tbody>
          </table>
          <h3 style={c.h3}>Example with curl</h3>
          <Pre label="bash">{`curl ${APP_URL}/api/v1/messages \\
  -H "content-type: application/json" \\
  -H "x-api-key: zph_live_abc123..." \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</Pre>
          <Warn>
            ⚠️ Always include <Code>anthropic-version</Code> header — it&apos;s
            forwarded upstream.
          </Warn>
        </section>

        {/* ── OpenAI Proxy ──────────────────────────────────────────────── */}
        <section id="openai">
          <h2 style={c.h2}>OpenAI Proxy</h2>
          <p style={c.p}>
            Replace <Code>https://api.openai.com</Code> with:
          </p>
          <Pre label="url">{`${APP_URL}/openai`}</Pre>
          <h3 style={c.h3}>Supported endpoints</h3>
          <table style={c.table}>
            <thead>
              <tr>
                <th style={c.th}>Method</th>
                <th style={c.th}>Path</th>
                <th style={c.th}>Streaming</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={c.td}>
                  <span
                    style={{
                      ...c.tag,
                      background: "rgba(16,185,129,0.15)",
                      color: "#10B981",
                    }}
                  >
                    POST
                  </span>
                </td>
                <td
                  style={{
                    ...c.td,
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 12,
                  }}
                >
                  /v1/chat/completions
                </td>
                <td style={c.td}>✅ Yes (SSE)</td>
              </tr>
            </tbody>
          </table>
          <Tip>
            💡 For streaming,{" "}
            <Code>{`stream_options: { include_usage: true }`}</Code> is
            auto-injected so usage data is always captured.
          </Tip>
          <h3 style={c.h3}>Example with curl</h3>
          <Pre label="bash">{`curl ${APP_URL}/openai/v1/chat/completions \\
  -H "content-type: application/json" \\
  -H "Authorization: Bearer zph_live_abc123..." \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</Pre>
        </section>

        {/* ── Claude Code Setup ─────────────────────────────────────────── */}
        <section id="claude-code">
          <h2 style={c.h2}>Claude Code Setup</h2>
          <p style={c.p}>
            Point Claude Code at your Zyphra proxy. Add these two environment
            variables:
          </p>
          <Pre label="~/.claude/settings.json">{`{
  "env": {
    "ANTHROPIC_BASE_URL": "${APP_URL}/api",
    "ANTHROPIC_AUTH_TOKEN": "zph_live_abc123def456..."
  }
}`}</Pre>
          <p style={c.p}>
            That&apos;s it. Claude Code will use your sub-key for all requests.
            Your team members each get their own key with individual budget
            limits.
          </p>
          <Tip>
            💡 You can also set these globally with <Code>export</Code> in your
            shell profile, or per-project in <Code>.claude/settings.json</Code>.
          </Tip>
        </section>

        {/* ── Other Tools ───────────────────────────────────────────────── */}
        <section id="tools">
          <h2 style={c.h2}>Cursor / Windsurf / Cline</h2>
          <p style={c.p}>
            Any tool that supports Anthropic or OpenAI API compatible endpoints
            works with Zyphra.
          </p>

          <h3 style={c.h3}>Cursor</h3>
          <p style={c.p}>
            Go to <strong>Settings → Models</strong> and set:
          </p>
          <Pre label="cursor settings">{`OpenAI API Base URL: ${APP_URL}/openai
OpenAI API Key:      zph_live_abc123...

Anthropic Base URL:  ${APP_URL}/api
Anthropic API Key:   zph_live_abc123...`}</Pre>

          <h3 style={c.h3}>Windsurf</h3>
          <p style={c.p}>
            Go to <strong>Settings → AI → API Keys</strong> and configure:
          </p>
          <Pre label="windsurf">{`Anthropic Base URL:  ${APP_URL}/api
Anthropic API Key:   zph_live_abc123...

OpenAI Base URL:     ${APP_URL}/openai
OpenAI API Key:      zph_live_abc123...`}</Pre>

          <h3 style={c.h3}>Cline (VS Code)</h3>
          <p style={c.p}>
            In the Cline extension settings, update the API endpoint:
          </p>
          <Pre label="cline settings">{`API Provider:     Anthropic (or OpenAI)
Base API URL:     ${APP_URL}/api
API Key:          zph_live_abc123...`}</Pre>
        </section>

        {/* ── Response Headers ──────────────────────────────────────────── */}
        <section id="headers">
          <h2 style={c.h2}>Response Headers</h2>
          <p style={c.p}>
            Every response includes diagnostic headers so you can see what
            happened:
          </p>
          <table style={c.table}>
            <thead>
              <tr>
                <th style={c.th}>Header</th>
                <th style={c.th}>Description</th>
                <th style={c.th}>Example</th>
              </tr>
            </thead>
            <tbody>
              {[
                { h: "x-cache", desc: "Cache hit or miss", ex: "HIT / MISS" },
                {
                  h: "x-routed",
                  desc: "Model routing swap",
                  ex: "gpt-4o → gpt-4o-mini",
                },
                {
                  h: "x-tier",
                  desc: "Complexity tier (simple/medium/complex)",
                  ex: "simple",
                },
                {
                  h: "x-key",
                  desc: "Which pool key was used",
                  ex: "Key 1 - Prod",
                },
                {
                  h: "x-request-id",
                  desc: "Unique request ID for debugging",
                  ex: "550e8400-...",
                },
              ].map((r) => (
                <tr key={r.h}>
                  <td
                    style={{
                      ...c.td,
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 12,
                      color: "#818CF8",
                    }}
                  >
                    {r.h}
                  </td>
                  <td style={c.td}>{r.desc}</td>
                  <td
                    style={{
                      ...c.td,
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 11,
                      color: "#56565F",
                    }}
                  >
                    {r.ex}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section id="features">
          <h2 style={c.h2}>Features Overview</h2>

          <h3 style={c.h3}>🧠 Smart Model Routing</h3>
          <p style={c.p}>
            Automatically routes simple prompts to cheaper models. When enabled,
            a prompt like &quot;hi&quot; gets routed to Claude Haiku instead of
            Opus, saving 50-80% on easy requests. Complex prompts with code or
            long context always use the originally requested model.
          </p>
          <table style={c.table}>
            <thead>
              <tr>
                <th style={c.th}>Tier</th>
                <th style={c.th}>Default Model</th>
                <th style={c.th}>Trigger</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={c.td}>Simple</td>
                <td style={c.td}>Claude Haiku 4.5 / GPT-4o Mini</td>
                <td style={c.td}>Under 100 tokens, no code signals</td>
              </tr>
              <tr>
                <td style={c.td}>Medium</td>
                <td style={c.td}>Claude Sonnet 4.6 / GPT-4o</td>
                <td style={c.td}>100-300 tokens</td>
              </tr>
              <tr>
                <td style={c.td}>Complex</td>
                <td style={c.td}>Passthrough (original model)</td>
                <td style={c.td}>Over 300 tokens, code blocks, long context</td>
              </tr>
            </tbody>
          </table>

          <h3 style={c.h3}>⚡ Prompt Caching</h3>
          <p style={c.p}>
            Identical non-streaming requests are served from an in-memory cache.
            The cache uses SHA-256 exact matching — zero false positives. Cache
            hits return instantly with 100% cost savings on API calls.
          </p>
          <Tip>
            💡 Caching only applies to non-streaming (non-SSE) requests.
            Streaming responses are always forwarded live.
          </Tip>

          <h3 style={c.h3}>⚖️ Key Pool Load Balancing</h3>
          <p style={c.p}>
            Add multiple API keys per provider. Requests distribute across keys
            by priority and usage. If a key hits a 429 rate limit, the next
            available key is tried automatically (up to 3 retries).
          </p>

          <h3 style={c.h3}>💰 Budget Enforcement</h3>
          <p style={c.p}>
            Set monthly spend limits and daily request limits per sub-key. When
            a limit is hit, the key is blocked until the next month. Email
            alerts fire at 80% and 100% of the budget.
          </p>
        </section>

        {/* ── Error Codes ───────────────────────────────────────────────── */}
        <section id="errors">
          <h2 style={c.h2}>Error Codes</h2>
          <table style={c.table}>
            <thead>
              <tr>
                <th style={c.th}>Status</th>
                <th style={c.th}>Meaning</th>
                <th style={c.th}>What to do</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  style={{
                    ...c.td,
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 600,
                    color: "#10B981",
                  }}
                >
                  200
                </td>
                <td style={c.td}>Success</td>
                <td style={c.td}>—</td>
              </tr>
              <tr>
                <td
                  style={{
                    ...c.td,
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 600,
                    color: "#EF4444",
                  }}
                >
                  401
                </td>
                <td style={c.td}>Invalid or missing API key</td>
                <td style={c.td}>
                  Check your <Code>zph_live_</Code> key is correct and active
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    ...c.td,
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 600,
                    color: "#F59E0B",
                  }}
                >
                  429
                </td>
                <td style={c.td}>Budget exceeded or rate limited</td>
                <td style={c.td}>Check your budget limits in the dashboard</td>
              </tr>
              <tr>
                <td
                  style={{
                    ...c.td,
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 600,
                    color: "#EF4444",
                  }}
                >
                  500
                </td>
                <td style={c.td}>Internal error</td>
                <td style={c.td}>
                  Check the <Code>x-request-id</Code> header and contact support
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    ...c.td,
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 600,
                    color: "#EF4444",
                  }}
                >
                  502
                </td>
                <td style={c.td}>Upstream API unreachable</td>
                <td style={c.td}>
                  Your upstream key may be invalid or the API is down
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── Rate Limits ───────────────────────────────────────────────── */}
        <section id="limits">
          <h2 style={c.h2}>Rate Limits</h2>
          <table style={c.table}>
            <thead>
              <tr>
                <th style={c.th}>Plan</th>
                <th style={c.th}>Sub-keys</th>
                <th style={c.th}>Requests/mo</th>
                <th style={c.th}>Features</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  plan: "Free",
                  keys: "3",
                  reqs: "1,000",
                  feat: "Basic dashboard, usage tracking",
                },
                {
                  plan: "Starter",
                  keys: "10",
                  reqs: "10,000",
                  feat: "Email alerts, budget enforcement, 30-day history",
                },
                {
                  plan: "Team",
                  keys: "25",
                  reqs: "50,000",
                  feat: "Smart routing, key pool, priority support",
                },
                {
                  plan: "Business",
                  keys: "∞",
                  reqs: "Unlimited",
                  feat: "SSO, audit logs, dedicated support",
                },
              ].map((r) => (
                <tr key={r.plan}>
                  <td style={{ ...c.td, fontWeight: 600, color: "#F0F0F4" }}>
                    {r.plan}
                  </td>
                  <td style={c.td}>{r.keys}</td>
                  <td style={c.td}>{r.reqs}</td>
                  <td style={c.td}>{r.feat}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={c.p}>
            Upstream API rate limits (per-key) are managed by the Key Pool —
            distribute multiple keys across your pool to bypass individual key
            limits.
          </p>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: "4rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid #1E1E24",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p style={{ fontSize: 12, color: "#56565F", margin: 0 }}>
            © 2026 Zyphra. Built for teams that take AI costs seriously.
          </p>
          <a
            href="/dashboard"
            style={{ fontSize: 13, color: "#6366F1", textDecoration: "none" }}
          >
            Open Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}
