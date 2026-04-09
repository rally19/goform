-- ============================================================
-- GoForm: Add collaboration_enabled to forms table
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS collaboration_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Comment for documentation
COMMENT ON COLUMN forms.collaboration_enabled IS
  'When true, enables real-time collaborative editing via Supabase Realtime (Presence + Broadcast)';
