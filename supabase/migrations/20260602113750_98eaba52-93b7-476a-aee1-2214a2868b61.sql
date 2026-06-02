CREATE POLICY "posters_public_list"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'competition-posters');