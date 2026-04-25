-- Removing Form Locking Feature
-- This script removes the form locking functionality from the database

-- 1. Remove locked_by column from form_fields table
ALTER TABLE public.form_fields DROP COLUMN IF EXISTS locked_by;

-- 2. Remove collaboration_enabled column from forms table (since locking was tied to this)
-- Note: Keeping collaboration_enabled as it might be useful for other features
-- ALTER TABLE public.forms DROP COLUMN IF EXISTS collaboration_enabled;

-- 3. Clean up any existing locks (set to null - though column will be dropped)
-- This is handled by the DROP COLUMN above

-- 4. Optional: Remove the last_toggled_by column if it's no longer needed
-- ALTER TABLE public.forms DROP COLUMN IF EXISTS last_toggled_by;

-- The form locking feature has been completely removed from the database schema.
