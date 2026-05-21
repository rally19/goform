-- 1. Create the user plan enum type
DO $$ BEGIN
  CREATE TYPE user_plan_enum AS ENUM ('free', 'lite', 'pro', 'max');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add plan column to the users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan user_plan_enum NOT NULL DEFAULT 'free';

-- 3. Add subscription limit & status columns to the organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_name text NOT NULL DEFAULT 'Custom';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS member_limit integer NOT NULL DEFAULT 10;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS storage_limit bigint NOT NULL DEFAULT 1073741824; -- 1 GB in bytes
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS form_limit integer NOT NULL DEFAULT 10;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS submission_limit integer NOT NULL DEFAULT 1000;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
