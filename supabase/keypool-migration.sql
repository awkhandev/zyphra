-- ═══════════════════════════════════════════════════════════════════
-- Zyphra — Phase 3 Part 3: Load Balancing Migration
-- Run AFTER: schema.sql + all previous migrations
--
-- Multiple API keys per workspace, spread across requests.
-- If one key hits 429, auto-retry with the next available key.
-- Zero overhead when pool is empty (falls back to workspace key).
-- ═══════════════════════════════════════════════════════════════════

-- ── Key Pool Table ────────────────────────────────────────────────
-- Each row is one API key that the proxy can use.
-- Keys are selected by: active = true, not rate-limited, under daily limit,
--   then by priority ASC (lower = preferred), then by fewest requests today.
create table if not exists public.api_key_pool (
  id                  uuid primary key default uuid_generate_v4(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  provider            text not null check (provider in ('anthropic', 'openai')),
  key_enc             text not null,              -- AES-256-GCM encrypted
  label               text not null,              -- "Key 1 - Production"
  priority            integer not null default 0, -- lower = tried first
  is_active           boolean not null default true,
  requests_today      integer not null default 0,
  daily_limit         integer,                    -- null = unlimited
  rate_limited_until  timestamptz,                -- null = not rate limited
  last_used_at        timestamptz,
  last_reset_at       timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────────────

-- Hot path: find best available key (active, under daily limit)
-- Note: rate_limited_until filter uses now() which is STABLE (not IMMUTABLE),
-- so it can't go in a partial index predicate. We filter it in the query instead.
create index if not exists idx_keypool_select
  on public.api_key_pool(workspace_id, provider, priority, requests_today)
  where is_active = true
    and (daily_limit IS NULL or requests_today < daily_limit);

-- ── Row Level Security ─────────────────────────────────────────────
alter table public.api_key_pool enable row level security;

-- Workspace members can read pool keys (for dashboard display)
create policy "keypool_member_read" on public.api_key_pool
  for select using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

-- No insert/update/delete policy — writes go through serviceSupabase only.

-- ── Atomic increment function ───────────────────────────────────────
-- Supabase JS client can't do SQL expressions (requests_today + 1),
-- so we use an RPC function. Atomic, fast, one row update.
create or replace function public.increment_pool_key_usage(key_id_input uuid)
returns void
language sql
security definer
as $$
  update public.api_key_pool
  set requests_today = requests_today + 1,
      last_used_at   = now()
  where id = key_id_input;
$$;

-- ── Manual reset function ──────────────────────────────────────────
create or replace function public.reset_pool_daily_counts()
returns void
language sql
security definer
as $$
  update public.api_key_pool
  set requests_today = 0,
      last_reset_at  = now()
  where last_reset_at < date_trunc('day', now());
$$;
