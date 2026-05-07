-- ============================================================
-- FIRE Station — Client Tags
-- Adds a free-text tag list to client_profiles. Tags are user-generated
-- (no enum), filterable via the dashboard's saved-views chip system, and
-- editable from the EditModal Activity & Notes tab.
--
-- Run in Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- GIN index lets future queries do `tags @> ARRAY['VIP']` quickly.
-- Not strictly required today (the dashboard filters in-memory after fetch),
-- but cheap insurance for the moment we want server-side filtering.
CREATE INDEX IF NOT EXISTS idx_client_profiles_tags
  ON public.client_profiles USING GIN (tags);

-- RLS: existing policies on client_profiles already cover this column.
-- No new policies needed.
