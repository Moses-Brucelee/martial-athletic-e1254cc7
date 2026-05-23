
-- Allow self-request: users can insert their own pending gym_members row
CREATE OR REPLACE FUNCTION public.request_gym_affiliation(p_gym_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile_id uuid;
  v_existing RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = v_user_id;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT id, status INTO v_existing
  FROM public.gym_members
  WHERE gym_id = p_gym_id AND user_id = v_profile_id;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object('status', v_existing.status, 'id', v_existing.id);
  END IF;

  INSERT INTO public.gym_members (gym_id, user_id, role, status)
  VALUES (p_gym_id, v_profile_id, 'member', 'pending')
  RETURNING id, status INTO v_existing;

  RETURN jsonb_build_object('status', v_existing.status, 'id', v_existing.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_gym_request(p_member_id uuid, p_accept boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_owner_profile_id uuid;
  v_member RECORD;
  v_is_owner boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_owner_profile_id FROM public.profiles WHERE user_id = v_user_id;

  SELECT gm.*, g.owner_id AS gym_owner_id
  INTO v_member
  FROM public.gym_members gm
  JOIN public.gyms g ON g.id = gm.gym_id
  WHERE gm.id = p_member_id;

  IF v_member.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  v_is_owner := v_member.gym_owner_id = v_owner_profile_id OR public.is_super_user(v_user_id);
  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_accept THEN
    UPDATE public.gym_members SET status = 'active' WHERE id = p_member_id;
    RETURN jsonb_build_object('status', 'active');
  ELSE
    DELETE FROM public.gym_members WHERE id = p_member_id;
    RETURN jsonb_build_object('status', 'rejected');
  END IF;
END;
$$;
