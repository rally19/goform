-- Secure the goform-assets and embersatu buckets
-- This script prevents users from uploading or managing assets belonging to organizations they don't own.

-- 1. Secure goform-assets Bucket (Form Assets)
-- Path structure: [org_id]/[form_id]/...
DROP POLICY IF EXISTS "storage_assets_insert" ON storage.objects;
CREATE POLICY "storage_assets_insert_restricted"
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'goform-assets' AND
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id::text = (storage.foldername(name))[1]
    AND om.user_id = auth.uid()::text
  )
);

-- 2. Secure embersatu Bucket (Org Avatars)
-- Filename structure: org_avatars/[org_id]-[random].jpg
DROP POLICY IF EXISTS "Allow authenticated org avatar upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to manage org avatars" ON storage.objects;

CREATE POLICY "Allow members to manage their org avatars"
ON storage.objects
FOR ALL 
TO authenticated
USING (
  bucket_id = 'embersatu' AND
  (storage.foldername(name))[1] = 'org_avatars' AND
  EXISTS (
    SELECT 1 FROM public.organization_members om
    -- Assumes the filename starts with a 36-character UUID
    WHERE om.organization_id::text = substring(storage.filename(name) from 1 for 36)
    AND om.user_id = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'embersatu' AND
  (storage.foldername(name))[1] = 'org_avatars' AND
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id::text = substring(storage.filename(name) from 1 for 36)
    AND om.user_id = auth.uid()::text
  )
);
