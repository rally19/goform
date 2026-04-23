-- Secure anonymous uploads to the form-uploads bucket
-- This script replaces the permissive "upload anything" policy with one that validates 
-- the form exists and is currently accepting responses.

-- 1. Remove the old permissive policy
DROP POLICY IF EXISTS "Allow anonymous and authenticated uploads" ON storage.objects;

-- 2. Create a smarter policy for uploads
CREATE POLICY "Allow anonymous uploads to active forms"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'form-uploads' 
  AND (storage.foldername(name))[1] = 'forms'      -- Must start with 'forms/'
  AND (storage.foldername(name))[3] = 'responses'  -- Must be in 'responses/' subfolder
  AND EXISTS (
    SELECT 1 FROM public.forms f
    WHERE f.id::text = (storage.foldername(name))[2] -- Form ID must match path part
    AND f.accept_responses = true                    -- Form must be set to accept responses
  )
);

-- Note: This still allows anonymous users to upload, but they can only upload
-- into the specific response folder of a form that is currently active.
