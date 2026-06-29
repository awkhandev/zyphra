-- ── Billing columns migration (rename from stripe_ to billing_) ───────────────
-- Run this in Supabase SQL Editor
-- This makes columns provider-agnostic so swapping payment providers is easy

-- Rename existing stripe columns to generic billing columns
alter table public.workspaces
  rename column stripe_customer_id     to billing_customer_id;

alter table public.workspaces
  rename column stripe_subscription_id to billing_subscription_id;

-- Update index names to match
drop index if exists idx_workspaces_stripe_customer;
drop index if exists idx_workspaces_stripe_sub;

create index if not exists idx_workspaces_billing_customer
  on public.workspaces(billing_customer_id);

create index if not exists idx_workspaces_billing_sub
  on public.workspaces(billing_subscription_id);