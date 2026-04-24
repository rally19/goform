-- Add RLS policy to allow users to upload personal assets
-- Fixes: "new row violates row-level security policy"

CREATE POLICY "Allow personal asset upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'goform-assets' AND
  (storage.foldername(name))[1] = 'personal' AND
  (storage.foldername(name))[2] = (auth.uid())::text
);
