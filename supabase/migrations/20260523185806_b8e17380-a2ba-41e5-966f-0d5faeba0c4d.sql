
ALTER TABLE public.gym_member_invitations
  ADD COLUMN IF NOT EXISTS declined_at timestamptz;

CREATE OR REPLACE FUNCTION public.respond_to_gym_invitation(
  p_invitation_id uuid,
  p_accept boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_invite RECORD;
  v_profile_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  SELECT * INTO v_invite
  FROM public.gym_member_invitations
  WHERE id = p_invitation_id;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF lower(v_invite.email) <> lower(v_email) THEN
    RAISE EXCEPTION 'This invitation is for a different email address';
  END IF;

  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_accepted', 'gym_id', v_invite.gym_id);
  END IF;

  IF v_invite.declined_at IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_declined');
  END IF;

  IF p_accept THEN
    SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = v_user_id;
    IF v_profile_id IS NULL THEN
      RAISE EXCEPTION 'Profile not found';
    END IF;

    INSERT INTO public.gym_members (gym_id, user_id, role, status)
    VALUES (v_invite.gym_id, v_profile_id, 'member', 'active')
    ON CONFLICT DO NOTHING;

    UPDATE public.gym_member_invitations
      SET accepted_at = now()
      WHERE id = p_invitation_id;

    RETURN jsonb_build_object('status', 'accepted', 'gym_id', v_invite.gym_id);
  ELSE
    UPDATE public.gym_member_invitations
      SET declined_at = now()
      WHERE id = p_invitation_id;
    RETURN jsonb_build_object('status', 'declined');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_to_gym_invitation(uuid, boolean) TO authenticated;

-- Allow the invited recipient to read their own pending invitation by id
DROP POLICY IF EXISTS "gym_invites_select_recipient" ON public.gym_member_invitations;
CREATE POLICY "gym_invites_select_recipient" ON public.gym_member_invitations
  FOR SELECT TO authenticated
  USING (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));
