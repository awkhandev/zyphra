-- ── OpenAI Support Migration ───────────────────────────────────────────────────
-- Run in Supabase SQL Editor

alter table public.workspaces
  add column if not exists openai_key_enc text;  -- AES-256 encrypted OpenAI API key