ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_unlocked_by uuid;

CREATE OR REPLACE FUNCTION public.enforce_profile_identity_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    v_is_super := public.is_super_user(auth.uid());
  END IF;

  IF OLD.identity_locked_at IS NOT NULL AND NOT v_is_super THEN
    IF (NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth)
       OR (NEW.gender IS DISTINCT FROM OLD.gender)
       OR (NEW.full_name IS DISTINCT FROM OLD.full_name)
       OR (NEW.age IS DISTINCT FROM OLD.age) THEN
      RAISE EXCEPTION 'Date of birth, age, gender and full name are locked. Please contact support to change them.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Lock identity fields the first time the profile becomes complete.
  IF NEW.identity_locked_at IS NULL
     AND COALESCE(NEW.profile_completed, false)
     AND OLD.identity_locked_at IS NULL THEN
    NEW.identity_locked_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_identity_lock ON public.profiles;
CREATE TRIGGER enforce_profile_identity_lock
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_identity_lock();

CREATE OR REPLACE FUNCTION public.admin_unlock_profile_identity(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL OR NOT public.is_super_user(v_caller) THEN
    RAISE EXCEPTION 'Only super users can unlock profile identity fields.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.profiles
  SET identity_locked_at = NULL,
      identity_unlocked_by = v_caller
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  RETURN jsonb_build_object('status', 'unlocked');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_unlock_profile_identity(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_name text;
  v_avatar text;
BEGIN
  v_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.email
  );
  v_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  INSERT INTO public.profiles (user_id, display_name, full_name, avatar_url)
  VALUES (
    NEW.id,
    v_name,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    v_avatar
  )
  RETURNING id INTO v_profile_id;

  -- Auto-accept any open gym invitations for this email
  IF NEW.email IS NOT NULL AND v_profile_id IS NOT NULL THEN
    INSERT INTO public.gym_members (gym_id, user_id, role, status)
    SELECT i.gym_id, v_profile_id, 'member', 'active'
    FROM public.gym_member_invitations i
    WHERE lower(i.email) = lower(NEW.email)
      AND i.accepted_at IS NULL
    ON CONFLICT DO NOTHING;

    UPDATE public.gym_member_invitations
    SET accepted_at = now()
    WHERE lower(email) = lower(NEW.email)
      AND accepted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;