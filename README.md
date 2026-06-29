# Zyphra — Setup Guide

## What you need (all free)

- Node.js 18+ → https://nodejs.org
- Supabase account → https://supabase.com
- Upstash account → https://upstash.com
- Vercel account (for deploy) → https://vercel.com

---

## Step 1 — Install dependencies

```bash
cd zyphra
npm install
```

---

## Step 2 — Supabase setup

1. Go to https://supabase.com → New project
2. Once created: Settings → API
   - Copy `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`
3. Go to SQL Editor → New Query → paste the entire contents of `supabase/schema.sql` → Run

---

## Step 3 — Upstash Redis setup

1. Go to https://console.upstash.com → Create Database → choose a region
2. After creation → REST API tab
   - Copy `UPSTASH_REDIS_REST_URL`
   - Copy `UPSTASH_REDIS_REST_TOKEN`

---

## Step 4 — Generate your encryption key

Run this in your terminal to generate a secure 32-byte key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output → this is your `ENCRYPTION_KEY`

---

## Step 5 — Create .env.local

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

---

## Step 6 — Run locally

```bash
npm run dev
```

Open http://localhost:3000 — you should see the login page.

---

## Step 7 — Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Follow the prompts. Then go to your Vercel dashboard → project → Settings → Environment Variables
and add all the variables from your `.env.local`.

---

## How developers use it

After you create a sub-key for a developer, they add this to their `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://your-app.vercel.app/api",
    "ANTHROPIC_AUTH_TOKEN": "zph_live_xxxxxxxxxxxxxxxxxxxx"
  }
}
```

That's it. Claude Code now routes through your proxy. You see all usage in the dashboard.

---

## File structure

```
teamkey/
├── app/
│   ├── api/
│   │   ├── v1/messages/route.ts   ← THE PROXY (most important)
│   │   ├── keys/route.ts          ← create/list/revoke sub-keys
│   │   ├── usage/route.ts         ← dashboard data
│   │   └── workspace/route.ts     ← workspace setup
│   ├── dashboard/page.tsx         ← manager dashboard UI
│   ├── layout.tsx
│   ├── page.tsx                   ← login/signup
│   └── globals.css
├── lib/
│   ├── supabase.ts                ← database clients
│   ├── crypto.ts                  ← AES-256 encryption
│   ├── keys.ts                    ← sub-key generation & lookup
│   └── usage.ts                   ← budget checking & logging
├── supabase/
│   └── schema.sql                 ← run this first in Supabase
├── middleware.ts                  ← auth route protection
└── .env.example                   ← copy to .env.local
```
