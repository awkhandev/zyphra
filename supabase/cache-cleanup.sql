-- ═══════════════════════════════════════════════════════════════════
-- Zyphra — Cache Cleanup Script
-- Run this BEFORE re-running cache-migration.sql
--
-- Drops all objects from the old cache-migration.sql so you can
-- run the new one cleanly. Safe to run multiple times (idempotent).
-- ═══════════════════════════════════════════════════════════════════

-- 1. Drop the table (cascades to indexes, policies, constraints)
drop table if exists public.prompt_cache cascade;

-- 2. Drop the cleanup function if it exists
drop function if exists public.cleanup_expired_cache();

-- 3. Drop the stats view if it exists
drop view if exists public.v_cache_stats;

-- 4. Drop workspace cache columns (in case they were added by old migration)
alter table public.workspaces drop column if exists cache_enabled;
alter table public.workspaces drop column if exists cache_ttl_hours;

-- 5. Drop usage_logs cached column if it exists
alter table public.usage_logs drop column if exists cached;

-- Done — now run cache-migration.sql fresh
