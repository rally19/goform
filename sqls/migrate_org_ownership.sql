-- 1. Make user_id nullable in forms table
ALTER TABLE forms ALTER COLUMN user_id DROP NOT NULL;

-- 2. Transition ownership: All organization forms will no longer be tied to individual users
UPDATE forms SET user_id = NULL WHERE organization_id IS NOT NULL;
