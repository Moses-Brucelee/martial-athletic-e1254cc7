
DROP POLICY IF EXISTS "Competition owner can upload poster" ON storage.objects;
DROP POLICY IF EXISTS "Competition owner can update poster" ON storage.objects;
DROP POLICY IF EXISTS "Competition owner can delete poster" ON storage.objects;

CREATE POLICY "Competition owner can upload poster files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'competition-posters'
  AND EXISTS (
    SELECT 1 FROM public.competitions c
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
      AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Competition owner can update poster files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'competition-posters'
  AND EXISTS (
    SELECT 1 FROM public.competitions c
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
      AND c.created_by = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'competition-posters'
  AND EXISTS (
    SELECT 1 FROM public.competitions c
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
      AND c.created_by = auth.uid()
  )
);

CREATE POLICY "Competition owner can delete poster files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'competition-posters'
  AND EXISTS (
    SELECT 1 FROM public.competitions c
    WHERE c.id::text = (storage.foldername(storage.objects.name))[1]
      AND c.created_by = auth.uid()
  )
);
