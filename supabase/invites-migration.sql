-- ── Member Invitations Migration ──────────────────────────────────────────────
-- Run in Supabase SQL Editor

create table public.workspace_invites (
  id           uuid        primary key default uuid_generate_v4(),
  workspace_id uuid        not null references public.workspaces(id) on delete cascade,
  invited_by   uuid        references auth.users(id) on delete set null,
  email        text        not null,
  role         text        not null default 'member'
                             check (role in ('admin','member')),
  token        text        not null unique default gen_random_uuid()::text,
  accepted_at  timestamptz,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  created_at   timestamptz not null default now(),

  -- Prevent duplicate pending invites for the same email in a workspace
  unique (workspace_id, email)
);

create index idx_invites_token        on public.workspace_invites(token);
create index idx_invites_workspace    on public.workspace_invites(workspace_id);
create index idx_invites_email        on public.workspace_invites(email);

-- RLS
alter table public.workspace_invites enable row level security;

-- Workspace owners/admins can manage invites
create policy "invites_admin_all" on public.workspace_invites
  for all using (
    workspace_id in (
      select id from public.workspaces where owner_id = auth.uid()
      union
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('owner','admin')
    )
  );

-- Anyone can read an invite by token (for the accept page — handled via service role)
-- No public RLS needed; accept endpoint uses service role