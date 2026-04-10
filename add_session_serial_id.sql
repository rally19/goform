-- Add serial_id to active_form_sessions for deterministic tie-breaking
ALTER TABLE public.active_form_sessions ADD COLUMN IF NOT EXISTS serial_id BIGSERIAL;
