CREATE POLICY "Super users can update any profile"
ON public.profiles
FOR UPDATE
USING (public.is_super_user(auth.uid()))
WITH CHECK (public.is_super_user(auth.uid()));