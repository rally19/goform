-- 1. Allow public read access to the 'embersatu' bucket
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'embersatu' );

-- 2. Allow authenticated users to upload avatars to the 'avatars/' folder
DROP POLICY IF EXISTS "Allow authenticated avatar upload" ON storage.objects;
CREATE POLICY "Allow authenticated avatar upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'embersatu' AND
  (storage.foldername(name))[1] = 'avatars' AND
  storage.filename(name) LIKE (auth.uid()::text || '-%')
);

-- 3. Allow users to update their own avatars
DROP POLICY IF EXISTS "Allow users to update their own avatars" ON storage.objects;
CREATE POLICY "Allow users to update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'embersatu' AND
  (SELECT auth.uid()) = owner
);

-- 4. Allow users to delete their own avatars
DROP POLICY IF EXISTS "Allow users to delete their own avatars" ON storage.objects;
CREATE POLICY "Allow users to delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'embersatu' AND
  (SELECT auth.uid()) = owner
);
