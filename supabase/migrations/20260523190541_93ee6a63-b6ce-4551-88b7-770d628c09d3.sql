
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated;

DROP POLICY IF EXISTS "gym_invites_select_recipient" ON public.gym_member_invitations;
CREATE POLICY "gym_invites_select_recipient" ON public.gym_member_invitations
  FOR SELECT TO authenticated
  USING (lower(email) = lower(public.current_user_email()));
