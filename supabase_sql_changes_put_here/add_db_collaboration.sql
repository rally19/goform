-- Upgrading to Database-Backed Realtime Collaboration

-- 1. Add locked_by to form_fields table (holds the User ID of the editor)
ALTER TABLE public.form_fields ADD COLUMN IF NOT EXISTS locked_by text;

-- 2. Create the active_form_sessions table
CREATE TABLE IF NOT EXISTS public.active_form_sessions (
    id text PRIMARY KEY,
    form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    user_id text NOT NULL,
    presence_key text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    color text NOT NULL,
    selected_field_id uuid,
    selected_field_id_text text,
    last_ping timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Create indexes for quick session cleanup
CREATE INDEX IF NOT EXISTS active_form_sessions_form_id_idx ON public.active_form_sessions(form_id);
CREATE INDEX IF NOT EXISTS active_form_sessions_last_ping_idx ON public.active_form_sessions(last_ping);

-- 4. Enable Supabase Realtime (Postgres Changes) for these tables!
-- Note: 'supabase_realtime' publication manages the tables broadcasted to clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.form_fields;
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_form_sessions;
