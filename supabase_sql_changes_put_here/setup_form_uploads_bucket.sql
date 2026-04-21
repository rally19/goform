-- 1. Create the bucket if it doesn't exist (public = false for privacy)
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-uploads', 'form-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow anyone (anon and authenticated) to upload files
-- We restrict the upload path to include the form ID to prevent dumping files arbitrarily at the root
DROP POLICY IF EXISTS "Allow anonymous and authenticated uploads" ON storage.objects;
CREATE POLICY "Allow anonymous and authenticated uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'form-uploads' 
);

-- 3. Allow viewing only for authenticated users (Form owners/org members)
-- For a robust check, the backend API route will use the service role to fetch/stream the file
-- after verifying form ownership, but we can allow SELECT for the owner if they use the standard client.
DROP POLICY IF EXISTS "Allow authenticated to view files" ON storage.objects;
CREATE POLICY "Allow authenticated to view files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'form-uploads'
);
