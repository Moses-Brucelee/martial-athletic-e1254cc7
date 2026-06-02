DROP POLICY IF EXISTS gyms_insert ON public.gyms;
CREATE POLICY gyms_insert ON public.gyms
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())
    OR public.is_super_user(auth.uid())
  );