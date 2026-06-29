# Zyphra — Full Project Review

**Date:** June 18, 2026
**Reviewer:** Automated codebase analysis

---

## 1. What Is This Project?

**Zyphra** is a SaaS platform that acts as a **team API key manager and proxy** for AI APIs — specifically Anthropic (Claude) and OpenAI (GPT). It solves a real, growing pain point:

> Companies use AI APIs (Claude, GPT, etc.) but have no good way to manage which developers/projects are consuming their API budget. They share one master API key, can't track per-person usage, and have no budget controls.

**How it works:**

1. A company signs up and connects their **Anthropic** and/or **OpenAI API key** (encrypted with AES-256-GCM before storage).
2. They create **sub-keys** (prefixed `zph_live_`) for each developer or project.
3. Developers use their sub-key instead of the raw API key — all requests flow through Zyphra's proxy.
4. Every request is logged (model, tokens, cost, latency), budgets are enforced per-key, and a dashboard shows usage in real-time.
5. The company pays Zyphra a SaaS fee ($0–$99/mo) based on number of keys — their variable cost is zero since they use their own API keys upstream.

---

## 2. Tech Stack

| Layer            | Technology                                                               |
| ---------------- | ------------------------------------------------------------------------ |
| Frontend         | Next.js 14 (App Router), React 18, Tailwind CSS                          |
| Backend          | Next.js API Routes (serverless on Vercel)                                |
| Database         | Supabase (PostgreSQL + Auth + Row Level Security)                        |
| Cache/Rate Limit | Upstash Redis                                                            |
| Payments         | Lemon Squeezy (merchant of record — handles taxes globally)              |
| Email            | Resend or Brevo (dual provider, switchable via env)                      |
| Encryption       | Node.js `crypto` — AES-256-GCM for API keys, SHA-256 for sub-key hashing |
| Deployment       | Vercel (serverless, edge-ready)                                          |

---

## 3. Feature Inventory

### Core Features (Built & Functional)

- [x] **API Proxy** — Streaming and non-streaming proxy for both Anthropic (`/api/v1/messages`) and OpenAI (`/api/openai/v1/chat/completions`)
- [x] **Sub-Key Management** — Create, list, revoke sub-keys; each key shown only once on creation
- [x] **Budget Enforcement** — Monthly budget ($) and daily request limits per sub-key; blocked requests return 429
- [x] **Usage Tracking** — Every proxied request logged with model, tokens (input/output), cost, status code, latency
- [x] **Dashboard** — Dark-themed dashboard with stat cards (requests, tokens, cost, daily), keys table with budget bars
- [x] **Usage Charts** — SVG-based line chart with 30-day history (requests/tokens/cost toggle)
- [x] **Auth** — Supabase email/password auth with session management via middleware
- [x] **Workspace Setup** — First-time wizard for workspace name + Anthropic key connection
- [x] **Email Alerts** — Budget threshold alerts (80%, 100%) with professional HTML email templates
- [x] **Team Invitations** — Invite members via email with role assignment (admin/member), token-based acceptance
- [x] **Billing** — Lemon Squeezy integration (Free $0 / Starter $19 / Team $49 / Business $99) with checkout + webhook
- [x] **Multi-Provider** — OpenAI key support alongside Anthropic, single sub-key works with both
- [x] **RLS (Row Level Security)** — Supabase RLS policies for workspace isolation
- [x] **Rate Limiting** — Upstash Redis integration for rate limiting

### Database Design

- 5 core tables: `workspaces`, `workspace_members`, `sub_keys`, `usage_logs`, `budget_alerts`
- Plus: `workspace_invites` (for invitation flow), OpenAI key column on workspaces
- Materialized views: `v_monthly_spend`, `v_daily_requests` for fast dashboard queries
- 8 indexes covering all major query patterns
- Full RLS with 7 policies for workspace-scoped data isolation

---

## 4. Code Quality Assessment

### Strengths

- **Security is well thought out**: AES-256-GCM encryption for API keys, SHA-256 hashing for sub-keys (raw key never stored), RLS policies, service-role separation
- **Proxy handles streaming correctly**: Parses SSE chunks from both Anthropic and OpenAI to extract token usage from stream events
- **Graceful error handling**: Budget checks before forwarding, fire-and-forget logging to not slow responses, alert failures don't break the proxy
- **Clean architecture**: Separation of concerns — `lib/keys.ts`, `lib/usage.ts`, `lib/crypto.ts`, `lib/alerts.ts`, `lib/payments.ts`, `lib/mailer.ts`
- **Plan enforcement**: Hard limits on sub-key count per plan, enforced server-side
- **Dual email provider**: Resend (production) or Brevo (free, no domain verification needed)
- **Lemon Squeezy chosen over Stripe**: Smart decision for a Pakistan-based developer — Lemon Squeezy handles all VAT/taxes globally and works in Pakistan

### Areas for Improvement

- **Dashboard is a monolith**: `app/dashboard/page.tsx` is ~718 lines with 7 inline components. Should be split into separate component files.
- **No tests**: Zero test files in the entire project. No unit tests, no integration tests, no E2E tests.
- **No error boundary**: No React error boundary component for graceful failure handling in the UI.
- **No rate limiting on auth endpoints**: The `/api/keys`, `/api/workspace` routes don't have rate limiting (only the proxy might via Upstash).
- **No CSRF protection**: API routes rely on session cookies but don't implement CSRF tokens.
- **No input sanitization library**: Manual validation; could use Zod for schema validation.
- **No logging/observability**: Console.log only. No structured logging (e.g., Pino), no APM, no error tracking (e.g., Sentry).
- **No CI/CD**: No GitHub Actions, no automated testing, no deployment pipeline config.
- **No API documentation**: No OpenAPI/Swagger spec for the proxy API.
- **Inline styles**: Auth and dashboard pages use inline CSS objects instead of Tailwind classes (despite Tailwind being configured).
- **`nanoid` v3 import**: Uses `customAlphabet` from nanoid v3 (CJS-compatible) — works but could be modernized.
- **No landing/marketing page**: The root `/` path goes to auth, not a landing page explaining what Zyphra is.

---

## 5. Business Viability Assessment

### The Market Problem (Real & Growing)

AI API spending is exploding. Companies are spending $10K–$100K+/month on Claude/GPT APIs. They face:

- **No visibility** into which team member or project is burning tokens
- **No budget controls** — one rogue script can cost thousands overnight
- **Security risk** — sharing raw API keys across teams via Slack/email
- **No per-project cost allocation** for internal billing

### Competitor Landscape

| Competitor        | What They Do                          | Zyphra's Differentiation                                            |
| ----------------- | ------------------------------------- | ------------------------------------------------------------------- |
| Anthropic Console | Basic usage tracking, team management | No per-developer sub-keys, no budget enforcement, no OpenAI support |
| OpenAI Platform   | Similar to above                      | No cross-provider support                                           |
| Portkey.ai        | AI gateway with routing, caching      | Enterprise-focused, expensive, complex                              |
| Helicone          | LLM observability + proxy             | Developer-focused, no billing/team management                       |
| LiteLLM           | Open-source proxy                     | Self-hosted, requires DevOps, no SaaS dashboard                     |

**Zyphra's sweet spot**: Small-to-mid teams (5–50 developers) who want a simple, affordable SaaS — not enterprise infrastructure. There's a genuine gap here.

### Revenue Model Analysis

| Plan     | Price  | Max Keys  | Revenue/Company |
| -------- | ------ | --------- | --------------- |
| Free     | $0     | 3         | $0 (lead gen)   |
| Starter  | $19/mo | 10        | $19–228/yr      |
| Team     | $49/mo | 25        | $49–588/yr      |
| Business | $99/mo | Unlimited | $99–1,188/yr    |

- **Near-zero marginal cost**: Customers bring their own API keys. Zyphra's only costs are Supabase (~$25/mo), Upstash (~$10/mo), Vercel (~$20/mo), email (~$0). Total infra: ~$55/mo.
- **Breakeven**: ~3 paying customers covers infrastructure.
- **Margins**: After 10 customers, margins are 90%+.
- **LTV potential**: High — once integrated, teams don't switch API key managers.

### What Would Make Companies Buy This

**YES, companies would pay for this IF:**

1. **Trust is established** — API keys are sensitive. Companies need to trust the proxy with their most valuable secrets. The AES-256 encryption is correct, but you need a security audit, SOC 2 compliance path, and transparent security documentation.

2. **It actually works at scale** — The proxy needs to handle high throughput with low latency. Serverless (Vercel) may have cold start issues. Need load testing.

3. **The dashboard is actionable** — Current dashboard is functional but basic. Companies want: cost forecasting, anomaly detection, per-project drill-down, exportable reports, Slack alerts.

4. **It's reliable** — Zero downtime. If the proxy is down, developers can't use AI APIs. Need monitoring, alerts, fallback mechanisms.

5. **Compliance requirements are met** — Some industries need audit logs, data residency, SOC 2.

### Biggest Risks

1. **No tests** — Shipping without tests is a ticking time bomb for a product handling API keys
2. **No monitoring/alerting** — If the proxy breaks, you won't know until users complain
3. **Serverless cold starts** — Proxy latency matters; cold starts on Vercel could add 500ms–2s
4. **No API key rotation mechanism** — What if the upstream Anthropic/OpenAI key needs rotation?
5. **No audit trail** — Enterprise customers want immutable logs of who did what
6. **Single point of failure** — If Supabase is down, the entire system stops

---

## 6. What's Missing for Production Readiness

### Critical (Must Have Before Launch)

- [ ] **Test suite** — Unit tests for crypto, keys, usage, alerts. Integration tests for proxy. E2E tests for dashboard flows.
- [ ] **Error tracking** — Sentry or similar. You need to know when things break.
- [ ] **Monitoring** — Uptime monitoring (Betterstack/Pingdom), latency metrics, error rate alerts.
- [ ] **Landing page** — A marketing page explaining what Zyphra is, pricing, signup CTA. Right now `/` goes to login.
- [ ] **Rate limiting on all endpoints** — Not just the proxy. Auth endpoints, key management, etc.
- [ ] **API key rotation** — Allow workspace owners to rotate their upstream Anthropic/OpenAI key.

### Important (Should Have Before Scaling)

- [ ] **Component refactor** — Split dashboard into proper components
- [ ] **Zod validation** — Schema validation on all API inputs
- [ ] **Audit logs** — Immutable log of admin actions (key created, revoked, member invited, plan changed)
- [ ] **Slack alerts** — The `budget_alerts` table already has a `slack_webhook` column — wire it up
- [ ] **Usage export** — CSV/PDF export of usage reports for finance teams
- [ ] **SSO/SAML** — Enterprise teams need this
- [ ] **Custom domains** — White-label option for larger companies
- [ ] **Webhook support** — Let companies forward usage events to their systems

### Nice to Have (Future Differentiators)

- [ ] **AI-powered anomaly detection** — "This project's usage spiked 5x in the last hour"
- [ ] **Cost forecasting** — "At current rate, you'll exceed budget in 3 days"
- [ ] **Multi-model routing** — Automatically route to cheapest model that meets requirements
- [ ] **Prompt logging** — Optional prompt/response storage for compliance
- [ ] **Team analytics** — Who's using which models, productivity insights

---

## 7. Bottom Line Verdict

### As a Technical Prototype: **8/10**

The codebase is clean, well-architected, and covers a remarkable amount of ground for a Phase 1+2 build. The crypto, proxy streaming, budget enforcement, and email alerting are all implemented correctly. The database schema is thoughtful with proper indexing and RLS. This is genuinely impressive work.

### As a Production-Ready Product: **4/10**

It's not there yet. No tests, no monitoring, no landing page, no error tracking, no audit trail. These aren't optional for a product that handles API keys.

### As a Business That Companies Would Buy: **6/10 (with work)**

The problem is real and growing. The solution is well-scoped and affordable. The pricing model works. But trust is everything when you're asking companies to route their API keys through your proxy. You need:

- Security audit and documentation
- Uptime SLA and monitoring
- Test coverage and CI/CD
- A proper landing page that builds confidence
- At least a few reference customers

### The Path to $10K MRR

1. **Build trust** — Security audit, transparent docs, uptime badge
2. **Launch on Product Hunt / Hacker News** — Dev tools like this get traction there
3. **Content marketing** — "How we saved $5K/mo on AI API costs" blog posts
4. **Free tier as funnel** — 3 keys is enough to get hooked, not enough for a real team
5. **Integrate with Claude Code / Cursor / Windsurf** — These are the tools developers actually use
6. **Target startups** — They move fast, share keys, and have limited budget

### Final Assessment

This is a **strong foundation** for a real business. The core proxy architecture is solid, the feature set is thoughtful, and the market timing is excellent (AI API spending is growing 10x year over year). With 4–6 weeks of hardening (tests, monitoring, landing page, security hardening), this could be a viable product with paying customers.

The single biggest differentiator it has over competitors: **simplicity**. LiteLLM requires DevOps. Portkey is enterprise-complex. Zyphra is "sign up, paste your key, share with team, done." That's a powerful position.

---

_Review generated from analysis of 25+ source files across the Zyphra codebase._
