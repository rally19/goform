-- 1. Add 'manager' to the organization_role enum
-- Note: PostgreSQL doesn't allow adding values to enums inside a transaction in some environments.
-- If this fails, run it separately.
ALTER TYPE organization_role ADD VALUE IF NOT EXISTS 'manager';

-- 2. Add owner_deleted_at to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_deleted_at TIMESTAMP WITH TIME ZONE;

-- 3. (Optional) Create index for cleanup performance
CREATE INDEX IF NOT EXISTS idx_orgs_owner_deleted_at ON organizations(owner_deleted_at);
