-- Response Acceptance Controls
-- Adds submission limiter, start date, and end date to the forms table.

ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS submission_limit              INTEGER,
  ADD COLUMN IF NOT EXISTS submission_limit_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS submission_limit_remaining    INTEGER,
  ADD COLUMN IF NOT EXISTS submission_limit_decremental  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS starts_at                     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS starts_at_enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ends_at                       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at_enabled               BOOLEAN NOT NULL DEFAULT FALSE;

-- Index to speed up the submission count check during form submission
CREATE INDEX IF NOT EXISTS form_responses_form_id_count_idx ON form_responses (form_id);
