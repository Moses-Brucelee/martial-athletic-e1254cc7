
-- Restrict invite_code column on competition_teams: not readable through the Data API by anon or authenticated users.
-- Reads are only possible via the security definer function below, which checks captain/owner/super-user.

REVOKE SELECT ON public.competition_teams FROM anon, authenticated;

GRANT SELECT (id, competition_id, team_name, division, created_at, division_id, captain_user_id, is_complete)
  ON public.competition_teams TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.competition_teams TO authenticated;
GRANT ALL ON public.competition_teams TO service_role;

CREATE OR REPLACE FUNCTION public.get_team_invite_code(p_team_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_team RECORD;
  v_profile_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, competition_id, captain_user_id, invite_code
    INTO v_team
  FROM public.competition_teams
  WHERE id = p_team_id;

  IF v_team.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF public.is_super_user(v_user) THEN
    RETURN v_team.invite_code;
  END IF;

  IF public.is_competition_owner(v_user, v_team.competition_id) THEN
    RETURN v_team.invite_code;
  END IF;

  IF v_team.captain_user_id = v_user THEN
    RETURN v_team.invite_code;
  END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = v_user;
  IF v_profile_id IS NOT NULL AND v_team.captain_user_id = v_profile_id THEN
    RETURN v_team.invite_code;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_invite_code(uuid) TO anon, authenticated;
