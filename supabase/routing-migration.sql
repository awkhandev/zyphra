-- ═══════════════════════════════════════════════════════════════════
-- Zyphra — Phase 3 Part 2: Smart Model Routing Migration
-- Run AFTER: schema.sql + all other migrations
--
-- Adds smart routing columns to workspaces table.
-- When enabled, simple prompts auto-route to cheaper models.
-- ═══════════════════════════════════════════════════════════════════

-- ── Routing Config ─────────────────────────────────────────────────
-- Per-workspace routing: enable/disable + model mapping per complexity tier.
-- routing_config example:
--   {"simple":"claude-haiku-4-5-20251001","medium":"claude-sonnet-4-6","complex":"passthrough"}

alter table public.workspaces
  add column if not exists routing_enabled boolean not null default false;

alter table public.workspaces
  add column if not exists routing_config jsonb not null default '{
    "simple":  "claude-haiku-4-5-20251001",
    "medium":  "claude-sonnet-4-6",
    "complex": "passthrough"
  }';

-- OpenAI routing config (separate mapping for GPT models)
alter table public.workspaces
  add column if not exists routing_config_openai jsonb not null default '{
    "simple":  "gpt-4o-mini",
    "medium":  "gpt-4o",
    "complex": "passthrough"
  }';

-- ── Usage Logs Enhancement ─────────────────────────────────────────
-- When routing swaps the model, record what was originally requested.
-- This lets the dashboard show "requested X, routed to Y".
alter table public.usage_logs
  add column if not exists original_model text;  -- null = no routing happened
