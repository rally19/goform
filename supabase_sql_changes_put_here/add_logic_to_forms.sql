-- Add logic jsonb array to forms to persist logic rules
-- Each rule: { id, name, enabled, action, targets, conditions, orderIndex, ... }
ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS logic jsonb NOT NULL DEFAULT '[]'::jsonb;
