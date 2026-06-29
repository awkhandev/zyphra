-- ═══════════════════════════════════════════════════════════════════
-- Zyphra — Phase 3: Prompt Cache Migration
-- Run AFTER: schema.sql, billing-migration.sql, invites-migration.sql, openai-migration.sql
--
-- Exact-match prompt cache: SHA-256 hash of normalized prompt → cached response.
-- Saves 100% of API cost on cache hits. Non-streaming responses only.
-- ═══════════════════════════════════════════════════════════════════

-- ── Cache Table ────────────────────────────────────────────────────
-- Stores full API responses keyed by normalized prompt hash.
-- Same prompt + same model + same workspace = cache hit.
create table if not exists public.prompt_cache (
  id                uuid primary key default uuid_generate_v4(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  prompt_hash       text not null,             -- SHA-256 hex of normalized prompt
  model             text not null,             -- model used for this response
  response_body     jsonb not null,            -- full upstream response JSON
  input_tokens      integer not null default 0,
  output_tokens     integer not null default 0,
  cost_usd          numeric(12,8) not null default 0,
  hit_count         integer not null default 0,
  last_hit_at       timestamptz,               -- null until first cache hit
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null,       -- TTL computed from workspace setting
  constraint uq_prompt_cache_key unique(workspace_id, prompt_hash, model)
);

-- ── Indexes ────────────────────────────────────────────────────────

-- Primary lookup: workspace + hash (filter expired at query time)
create index if not exists idx_cache_lookup
  on public.prompt_cache(workspace_id, prompt_hash);

-- Periodic cleanup of expired entries
create index if not exists idx_cache_expires
  on public.prompt_cache(expires_at);

-- Stats queries: workspace aggregation
create index if not exists idx_cache_workspace_hits
  on public.prompt_cache(workspace_id, hit_count);

-- ── Row Level Security ─────────────────────────────────────────────
-- Service role (used by proxy) bypasses RLS — safety net only.
alter table public.prompt_cache enable row level security;

-- Workspace members can read cache entries (for dashboard stats)
create policy "cache_member_read" on public.prompt_cache
  for select using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

-- No insert/update/delete policy — writes go through serviceSupabase only,
-- matching the pattern used by usage_logs and budget_alerts.

-- ── Cache Stats View ───────────────────────────────────────────────
-- Simple aggregation — no correlated subqueries.
-- Returns per-workspace cache performance metrics.
create or replace view public.v_cache_stats as
select
  workspace_id,
  count(*)                                         as total_entries,
  coalesce(sum(hit_count), 0)                      as total_hits,
  coalesce(sum(input_tokens * hit_count), 0)       as tokens_saved,
  coalesce(sum(cost_usd * hit_count), 0)           as cost_saved_usd,
  max(last_hit_at)                                 as last_hit_at
from public.prompt_cache
group by workspace_id;

-- ── Expired Cache Cleanup Function ─────────────────────────────────
-- Call periodically (or via Supabase cron) to purge expired entries.
-- Returns the number of deleted rows.
create or replace function public.cleanup_expired_cache()
returns integer
language sql
security definer   -- runs as owner, bypasses RLS
as $$
  with deleted as (
    delete from public.prompt_cache
    where expires_at < now()
    returning 1
  )
  select count(*) from deleted;
$$;

-- ── Workspace Cache Config ─────────────────────────────────────────
-- Columns on workspaces table to control caching behavior.
alter table public.workspaces
  add column if not exists cache_enabled boolean not null default true;

alter table public.workspaces
  add column if not exists cache_ttl_hours integer not null default 168; -- 7 days

-- ── Usage Logs Enhancement ─────────────────────────────────────────
-- Add a cached flag to distinguish cache-hit responses from real API calls.
-- When a response is served from cache, cost_usd = 0 and cached = true.
-- This lets the dashboard show "X requests served from cache, saving $Y.YY"
alter table public.usage_logs
  add column if not exists cached boolean not null default false;
