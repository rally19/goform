-- Add last_toggled_by column to forms table to track session authority
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS last_toggled_by text;
