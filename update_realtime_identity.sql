-- ENSURING FULL DATABASE BROADCASTS
-- Run this in your Supabase SQL Editor if real-time locks stop updating.

-- This ensures that when a field's lock status changes, 
-- Supabase sends the entire row data (including the 'locked_by' column) 
-- even if other columns didn't change.

ALTER TABLE public.form_fields REPLICA IDENTITY FULL;
ALTER TABLE public.forms REPLICA IDENTITY FULL;
ALTER TABLE public.active_form_sessions REPLICA IDENTITY FULL;

-- Re-verify that these tables are in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'form_fields'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.form_fields;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'forms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.forms;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'active_form_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.active_form_sessions;
  END IF;
END $$;
