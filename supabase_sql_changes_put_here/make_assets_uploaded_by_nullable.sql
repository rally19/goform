-- Make assets.uploaded_by nullable so anonymous response uploads on
-- org-owned forms (where forms.user_id is NULL after move-to-org) don't
-- violate NOT NULL.
ALTER TABLE assets ALTER COLUMN uploaded_by DROP NOT NULL;

-- Replace the existing FK with ON DELETE SET NULL so deleting the user
-- doesn't cascade-destroy assets they merely uploaded.
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_uploaded_by_users_id_fk;
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_uploaded_by_fkey;

ALTER TABLE assets
  ADD CONSTRAINT assets_uploaded_by_users_id_fk
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;
