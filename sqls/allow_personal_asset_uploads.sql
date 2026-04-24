-- Fix for "new row violates row-level security policy" when uploading personal assets
-- This script adds a policy to allow authenticated users to upload to their own personal space in the goform-assets bucket.

-- Path structure enforced by generateStoragePath: personal/{user_id}/{timestamp}_{filename}

CREATE POLICY "Allow personal asset upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'goform-assets' AND
  (storage.foldername(name))[1] = 'personal' AND
  (storage.foldername(name))[2] = (auth.uid())::text
);
