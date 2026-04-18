-- Add section_id to form_fields so each field knows which section it belongs to
ALTER TABLE form_fields
  ADD COLUMN IF NOT EXISTS section_id uuid;

-- Add sections jsonb array to forms to persist section metadata (id, name, description, orderIndex)
ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Index for fast section-based field queries
CREATE INDEX IF NOT EXISTS form_fields_section_id_idx ON form_fields (section_id);
