-- Fix for overly permissive storage RLS policy for form-uploads bucket
-- This script tightens the security by ensuring only form owners or organization members can view uploaded files.

-- 1. Remove the policies we are replacing/updating
DROP POLICY IF EXISTS "Allow authenticated to view files" ON storage.objects;
DROP POLICY IF EXISTS "Allow form owners and members to view uploads" ON storage.objects;

-- 2. Create a new restricted policy for viewing files in the form-uploads bucket
CREATE POLICY "Allow form owners and members to view uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'form-uploads' AND (
    EXISTS (
      SELECT 1 FROM public.forms f
      LEFT JOIN public.organization_members om ON f.organization_id = om.organization_id
      WHERE 
        -- Check if the second part of the path matches the form ID
        -- Path structure: forms/[form_id]/responses/...
        f.id::text = (storage.foldername(name))[2]
        AND (
          -- User is the creator of the form
          f.user_id = auth.uid()::text 
          OR 
          -- User is a member of the organization that owns the form
          om.user_id = auth.uid()::text
        )
    )
  )
);

-- 3. Ensure anonymous users cannot view files (unless they have a valid signed URL, which bypasses RLS)
-- (No changes needed if bucket is already private, but this reinforces the security)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Keep existing upload policy (it was already restricted to the bucket but currently allows anyone to upload)
-- If we want to restrict uploads to only participants, we could add more logic here, 
-- but the user's primary concern was viewing private links.
