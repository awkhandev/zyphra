-- ═══════════════════════════════════════════════════════════════════
-- Zyphra — Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Workspaces ─────────────────────────────────────────────────────
-- One workspace = one company/team
create table public.workspaces (
  id                    uuid primary key default uuid_generate_v4(),
  name                  text not null,
  owner_id              uuid not null references auth.users(id) on delete cascade,
  anthropic_key_enc     text,           -- AES-256 encrypted Anthropic API key
  plan                  text not null default 'free'
                          check (plan in ('free','starter','team','business')),
  monthly_budget_usd    numeric(10,2),  -- null = no workspace-level cap
  created_at            timestamptz not null default now()
);

-- ── Workspace Members ──────────────────────────────────────────────
create table public.workspace_members (
  id            uuid primary key default uuid_generate_v4(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'member' check (role in ('owner','admin','member')),
  joined_at     timestamptz not null default now(),
  unique(workspace_id, user_id)
);

-- ── Sub-keys ───────────────────────────────────────────────────────
-- Each developer/project gets a unique sub-key
create table public.sub_keys (
  id                uuid primary key default uuid_generate_v4(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  created_by        uuid references auth.users(id) on delete set null,
  label             text not null,                  -- e.g. "Alice (backend)" or "Project: Search"
  key_hash          text not null unique,            -- SHA-256 hash of the raw key
  key_prefix        text not null,                   -- first 12 chars for display e.g. "zph_live_abc"
  monthly_budget_usd  numeric(10,2),                -- null = unlimited
  daily_request_limit int,                           -- null = unlimited
  is_active         boolean not null default true,
  last_used_at      timestamptz,
  created_at        timestamptz not null default now()
);

-- ── Usage Logs ─────────────────────────────────────────────────────
-- Every single proxied API call is logged here
create table public.usage_logs (
  id              bigserial primary key,
  sub_key_id      uuid not null references public.sub_keys(id) on delete cascade,
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  model           text not null,
  input_tokens    int not null default 0,
  output_tokens   int not null default 0,
  total_tokens    int generated always as (input_tokens + output_tokens) stored,
  cost_usd        numeric(10,6) not null default 0,  -- calculated on insert
  status_code     int not null default 200,
  error_message   text,
  duration_ms     int,
  created_at      timestamptz not null default now()
);

-- ── Budget Alerts ──────────────────────────────────────────────────
create table public.budget_alerts (
  id              uuid primary key default uuid_generate_v4(),
  sub_key_id      uuid not null references public.sub_keys(id) on delete cascade,
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  threshold_pct   int not null check (threshold_pct between 1 and 100), -- e.g. 80 = alert at 80%
  channel         text not null default 'email' check (channel in ('email','slack')),
  slack_webhook   text,
  last_fired_at   timestamptz,
  created_at      timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────────────
create index idx_sub_keys_workspace    on public.sub_keys(workspace_id);
create index idx_sub_keys_hash         on public.sub_keys(key_hash);
create index idx_usage_sub_key         on public.usage_logs(sub_key_id);
create index idx_usage_workspace       on public.usage_logs(workspace_id);
create index idx_usage_created_at      on public.usage_logs(created_at desc);
create index idx_usage_month           on public.usage_logs(sub_key_id, created_at);
create index idx_members_workspace     on public.workspace_members(workspace_id);
create index idx_members_user          on public.workspace_members(user_id);

-- ── Row Level Security ─────────────────────────────────────────────
alter table public.workspaces          enable row level security;
alter table public.workspace_members   enable row level security;
alter table public.sub_keys            enable row level security;
alter table public.usage_logs          enable row level security;
alter table public.budget_alerts       enable row level security;

-- Workspaces: owners can do anything; members can read
create policy "workspace_owner_all" on public.workspaces
  for all using (owner_id = auth.uid());

create policy "workspace_member_read" on public.workspaces
  for select using (
    id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

-- Members: workspace admins/owners manage; members read their own row
create policy "members_admin_all" on public.workspace_members
  for all using (
    workspace_id in (
      select id from public.workspaces where owner_id = auth.uid()
    )
  );

create policy "members_self_read" on public.workspace_members
  for select using (user_id = auth.uid());

-- Sub-keys: workspace members can read; admins/owners can write
create policy "subkeys_member_read" on public.sub_keys
  for select using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

create policy "subkeys_admin_write" on public.sub_keys
  for all using (
    workspace_id in (
      select id from public.workspaces where owner_id = auth.uid()
      union
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner','admin')
    )
  );

-- Usage logs: workspace members can read their workspace's logs
create policy "usage_member_read" on public.usage_logs
  for select using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid()
    )
  );

-- Service role bypasses RLS (used by the proxy API route)
-- No additional policy needed — service role always bypasses RLS

-- ── Helper Views ───────────────────────────────────────────────────

-- Monthly spend per sub-key (current month)
create or replace view public.v_monthly_spend as
select
  sub_key_id,
  workspace_id,
  date_trunc('month', now()) as month,
  count(*)                   as request_count,
  sum(input_tokens)          as input_tokens,
  sum(output_tokens)         as output_tokens,
  sum(total_tokens)          as total_tokens,
  sum(cost_usd)              as cost_usd
from public.usage_logs
where
  created_at >= date_trunc('month', now())
  and status_code = 200
group by sub_key_id, workspace_id;

-- Daily requests per sub-key (today)
create or replace view public.v_daily_requests as
select
  sub_key_id,
  workspace_id,
  count(*) as request_count
from public.usage_logs
where
  created_at >= date_trunc('day', now())
  and status_code = 200
group by sub_key_id, workspace_id;