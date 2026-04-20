-- ─── Asset Type Enum ──────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "asset_type" AS ENUM('image', 'video', 'document', 'audio', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ─── Assets Table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar REFERENCES "users"("id") ON DELETE CASCADE,
  "organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "original_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size" integer NOT NULL,
  "type" "asset_type" NOT NULL DEFAULT 'other',
  "storage_path" text NOT NULL,
  "url" text NOT NULL,
  "alt_text" text,
  "uploaded_by" varchar NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "assets_user_id_idx" ON "assets" ("user_id");
CREATE INDEX IF NOT EXISTS "assets_org_id_idx" ON "assets" ("organization_id");
CREATE INDEX IF NOT EXISTS "assets_type_idx" ON "assets" ("type");
CREATE INDEX IF NOT EXISTS "assets_created_at_idx" ON "assets" ("created_at");

-- ─── Supabase Storage Bucket ──────────────────────────────────────────────────
-- Run this in the Supabase Dashboard > Storage, or via SQL editor:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'goform-assets',
  'goform-assets',
  true,
  52428800, -- 50 MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
    'video/mp4', 'video/webm', 'video/ogg',
    'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
-- Enable RLS on assets table
ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read assets they own or that belong to their orgs
CREATE POLICY "assets_select" ON "assets"
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()::text
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()::text
    )
  );

-- Allow authenticated users to insert assets (workspace scope validated server-side)
CREATE POLICY "assets_insert" ON "assets"
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid()::text);

-- Allow asset owners / org editors+ to delete
CREATE POLICY "assets_delete" ON "assets"
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()::text
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()::text
        AND role IN ('owner', 'manager', 'administrator', 'editor')
    )
  );

-- Allow asset owners / org editors+ to update (rename)
CREATE POLICY "assets_update" ON "assets"
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()::text
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()::text
        AND role IN ('owner', 'manager', 'administrator', 'editor')
    )
  );

-- ─── Storage RLS for the bucket ───────────────────────────────────────────────
-- Anyone can read public files (bucket is public)
CREATE POLICY "storage_assets_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'goform-assets');

-- Only authenticated users can upload
CREATE POLICY "storage_assets_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'goform-assets');

-- Owners can update (upsert requires this)
CREATE POLICY "storage_assets_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'goform-assets' AND auth.uid()::text = owner);

-- Owners can delete
CREATE POLICY "storage_assets_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'goform-assets' AND auth.uid()::text = owner);
