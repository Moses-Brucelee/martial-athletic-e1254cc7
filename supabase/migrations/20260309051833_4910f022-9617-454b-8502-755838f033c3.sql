
-- Storage policies for competition-posters bucket
-- Allow competition owners to upload posters
CREATE POLICY "Competition owner can upload poster"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'competition-posters' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.competitions
    WHERE id::text = (storage.foldername(name))[1]
    AND created_by = auth.uid()
  )
);

-- Allow competition owners to update posters
CREATE POLICY "Competition owner can update poster"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'competition-posters' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.competitions
    WHERE id::text = (storage.foldername(name))[1]
    AND created_by = auth.uid()
  )
);

-- Allow competition owners to delete posters
CREATE POLICY "Competition owner can delete poster"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'competition-posters' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.competitions
    WHERE id::text = (storage.foldername(name))[1]
    AND created_by = auth.uid()
  )
);

-- Allow public read access (bucket is already public)
CREATE POLICY "Anyone can view competition posters"
ON storage.objects FOR SELECT
USING (bucket_id = 'competition-posters');

-- Add RLS policy for athletes table: owners can update their own linked athlete records
CREATE POLICY "athletes_update_own"
ON public.athletes FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
