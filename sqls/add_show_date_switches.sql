-- Add switches to control showing start/end dates in public forms

ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS show_starts_at  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS show_ends_at    BOOLEAN NOT NULL DEFAULT FALSE;
