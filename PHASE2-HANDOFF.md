# Zyphra — Phase 2 Handoff Document

# Paste this entire file at the start of a new chat to continue exactly from here.

---

## CONTEXT: What we're building

**Zyphra** — A SaaS product that acts as a team API key manager for Anthropic/Claude APIs.
Companies connect their Anthropic API key. We issue sub-keys to each developer/project.
All requests proxy through our server. We track usage, enforce budgets, and show a dashboard.

**Revenue model:** Charge per workspace/seat ($19–$199/month). They use their own Anthropic key — our variable cost is near zero.

**Stack:** Next.js 14 App Router + Supabase (auth + PostgreSQL) + Upstash Redis + Tailwind CSS + Vercel

---

## PHASE 1 — COMPLETE ✅

All 21 files built and zipped. Download: teamkey-phase1.zip

### Files created:

```
teamkey/
├── package.json                        ✅ all deps including nanoid, @supabase/ssr, @upstash/redis
├── tsconfig.json                       ✅
├── next.config.js                      ✅
├── tailwind.config.js                  ✅ custom dark theme (bg-bg-base, brand indigo #6366F1)
├── postcss.config.js                   ✅
├── .env.example                        ✅
├── middleware.ts                       ✅ protects /dashboard, redirects auth users from /
├── supabase/schema.sql                 ✅ full schema with RLS, indexes, views
├── lib/
│   ├── supabase.ts                     ✅ browser + server + serviceRole clients
│   ├── crypto.ts                       ✅ AES-256-GCM encrypt/decrypt + SHA-256 key hashing
│   ├── keys.ts                         ✅ generateRawKey, createSubKey, resolveSubKey, listSubKeys, revokeSubKey
│   └── usage.ts                        ✅ calculateCost, checkBudget, logUsage, getWorkspaceUsageSummary
├── app/
│   ├── globals.css                     ✅ Tailwind + custom component classes
│   ├── layout.tsx                      ✅ Inter + JetBrains Mono fonts
│   ├── page.tsx                        ✅ Login/signup with Supabase auth
│   ├── dashboard/page.tsx              ✅ Full manager dashboard (stats, keys table, modals)
│   └── api/
│       ├── v1/messages/route.ts        ✅ THE PROXY — streaming + non-streaming, budget enforcement
│       ├── keys/route.ts               ✅ GET/POST/DELETE sub-keys
│       ├── workspace/route.ts          ✅ POST create workspace, GET current workspace
│       └── usage/route.ts             ✅ GET usage summary for dashboard
└── README.md                          ✅ full setup guide
```

### Database tables built:

- `workspaces` — company account, encrypted Anthropic key, plan
- `workspace_members` — user↔workspace junction, roles (owner/admin/member)
- `sub_keys` — one per developer/project, key_hash + key_prefix, budget limits
- `usage_logs` — every proxied API call logged with tokens, cost, model, duration
- `budget_alerts` — threshold config (80%, 100%) per key
- Views: `v_monthly_spend`, `v_daily_requests`

### Key architectural decisions made:

- Sub-key format: `zph_live_` + 32 random alphanumeric chars
- Raw key shown ONCE on creation, never stored — only SHA-256 hash in DB
- Anthropic API key stored AES-256-GCM encrypted, IV+authTag+ciphertext packed in base64
- Streaming proxy parses SSE chunks to extract token usage from `message_start` + `message_delta`
- Budget checked BEFORE forwarding request (blocked = 429, logged as failed request)
- Usage logged AFTER response (fire-and-forget to not slow down response)
- Service role Supabase client used in proxy (bypasses RLS) — never exposed to browser

### Known issues to fix in Phase 2:

1. `nanoid` v5 is ESM-only — may need `"type": "module"` in package.json or downgrade to v3:
   `"nanoid": "^3.3.7"` and change import to `const { customAlphabet } = require('nanoid')`
2. `app/dashboard/page.tsx` is very large — should be split into components in Phase 2
3. No email alerts yet — budget_alerts table exists but alert-firing logic not built
4. No Stripe billing yet
5. No member invitation flow yet

---

## PHASE 2 — TO BUILD NEXT

### Priority order:

#### 2A — Email Alerts (2–3 files, ~200 lines)

When a sub-key hits 80% or 100% of monthly budget, fire an email.

- `lib/alerts.ts` — check thresholds, fire email, update last_fired_at
- `app/api/alerts/route.ts` — CRUD for alert configs
- Integrate alert check into the proxy after logUsage()
- Use Resend API (free tier: 100 emails/day) → https://resend.com

```typescript
// lib/alerts.ts — pseudocode for next session
async function checkAndFireAlerts(subKeyId, workspaceId, spentUsd, budgetUsd) {
  const pct = (spentUsd / budgetUsd) * 100;
  const thresholds = [80, 100];
  for (const t of thresholds) {
    if (pct >= t) {
      // check if alert already fired this month for this threshold
      // if not: send email via Resend, update last_fired_at
    }
  }
}
```

#### 2B — Member Invitations (2 files, ~150 lines)

- `app/api/invites/route.ts` — generate invite token, send email
- `app/invite/[token]/page.tsx` — accept invite page

#### 2C — Stripe Billing (2 files, ~300 lines)

- `app/api/stripe/route.ts` — create checkout session, webhook handler
- `app/dashboard/billing/page.tsx` — upgrade/downgrade UI
- Plans: free (3 keys), starter $19 (10 keys), team $49 (25 keys), business $99 (unlimited)
- Stripe products to create: one per plan with monthly price

#### 2D — Component Refactor (split dashboard/page.tsx)

The dashboard page is ~300 lines. Split into:

- `components/StatsGrid.tsx`
- `components/KeysTable.tsx`
- `components/NewKeyModal.tsx`
- `components/KeyRevealModal.tsx`
- `components/BudgetBar.tsx`

#### 2E — Usage Charts (recharts, ~100 lines)

- `components/UsageChart.tsx` — daily usage line chart for last 30 days
- `app/api/usage/history/route.ts` — last 30 days per-day aggregation

---

## PHASE 3 — LATER (don't start until Phase 2 is done)

- Slack webhook alerts
- Anomaly detection (spike alerts)
- Multi-provider support (OpenAI key + Anthropic key)
- SSO / Google Workspace login
- Audit logs export (CSV)
- Landing/marketing page

---

## HOW TO START PHASE 2 IN NEW CHAT

Paste this entire document, then say:

> "Continue building Zyphra. Phase 1 is done (all files listed above exist at /home/claude/teamkey/).
> Start Phase 2A — Email Alerts using Resend. Then 2B member invitations. Use the same stack
> and design system (dark theme, indigo accent #6366F1, Inter + JetBrains Mono fonts,
> Tailwind classes from the existing tailwind.config.js)."

---

## ENV VARS NEEDED (user must set up before running)

```
NEXT_PUBLIC_SUPABASE_URL=           # from Supabase dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # from Supabase dashboard → anon key
SUPABASE_SERVICE_ROLE_KEY=          # from Supabase dashboard → service_role key
UPSTASH_REDIS_REST_URL=             # from Upstash console → REST API
UPSTASH_REDIS_REST_TOKEN=           # from Upstash console → REST API
ENCRYPTION_KEY=                     # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NEXT_PUBLIC_APP_URL=                # http://localhost:3000 or your Vercel URL
# Add in Phase 2:
RESEND_API_KEY=                     # from resend.com (free tier)
STRIPE_SECRET_KEY=                  # from stripe.com dashboard
STRIPE_WEBHOOK_SECRET=              # from stripe.com webhooks
```

---

## IMMEDIATE NEXT STEPS FOR USER (before Phase 2)

1. `cd teamkey && npm install`
2. Create Supabase project → run supabase/schema.sql in SQL Editor
3. Create Upstash Redis database
4. Copy .env.example to .env.local and fill all values
5. `npm run dev` → should load at localhost:3000
6. Sign up → create workspace → paste your Anthropic key → create first sub-key
7. Add sub-key to ~/.claude/settings.json and test with Claude Code
