
-- Allow authenticated users to search profiles (needed for gym member adding)
CREATE POLICY "Authenticated users can search profiles"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
