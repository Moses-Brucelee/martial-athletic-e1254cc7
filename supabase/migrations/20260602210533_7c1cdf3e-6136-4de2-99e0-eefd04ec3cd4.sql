-- 1. Tighten competitions SELECT: no draft/unpublished leak to viewers
DROP POLICY IF EXISTS "View competitions" ON public.competitions;

CREATE POLICY "View competitions"
ON public.competitions
FOR SELECT
USING (
  -- Owner sees own
  (auth.uid() = created_by)
  -- Super user sees all
  OR public.is_super_user(auth.uid())
  -- Judges see assigned
  OR public.is_competition_judge(auth.uid(), id)
  -- Registrants see their own
  OR (auth.uid() IS NOT NULL AND public.is_competition_registrant(auth.uid(), id))
  -- Public visibility: only after publish (any non-draft, non-unpublished)
  OR (
    visibility = 'public'
    AND status NOT IN ('draft','unpublished')
  )
  -- Private gym members: same visibility gate
  OR (
    visibility = 'private'
    AND gym_id IS NOT NULL
    AND public.is_competition_gym_member(auth.uid(), id)
    AND status NOT IN ('draft','unpublished')
  )
);

-- 2. Affiliate-scoped INSERT on competitions: gym_id must be one the creator owns or is an active member of (or super-user)
DROP POLICY IF EXISTS "Users can create their own competitions" ON public.competitions;

CREATE POLICY "Users can create their own competitions"
ON public.competitions
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND public.has_competition_access(auth.uid())
  AND (
    gym_id IS NULL
    OR public.is_super_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.gyms g
      JOIN public.profiles p ON p.id = g.owner_id
      WHERE g.id = competitions.gym_id AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.gym_members gm
      JOIN public.profiles p ON p.id = gm.user_id
      WHERE gm.gym_id = competitions.gym_id
        AND p.user_id = auth.uid()
        AND gm.status = 'active'
    )
  )
);

-- 3. Helper: registration open check
CREATE OR REPLACE FUNCTION public.is_registration_open(p_competition_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT registration_deadline IS NULL OR now() < registration_deadline
     FROM public.competitions
     WHERE id = p_competition_id),
    false
  );
$$;

-- 4. Lock team write operations after deadline (owner/super bypass)
DROP POLICY IF EXISTS users_create_team_as_captain ON public.competition_teams;
CREATE POLICY users_create_team_as_captain
ON public.competition_teams
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = captain_user_id
  AND public.is_registration_open(competition_id)
);

DROP POLICY IF EXISTS captain_update_own_team ON public.competition_teams;
CREATE POLICY captain_update_own_team
ON public.competition_teams
FOR UPDATE
TO authenticated
USING (
  auth.uid() = captain_user_id
  AND public.is_registration_open(competition_id)
);

-- 5. Lock athlete_registrations writes after deadline for non-owners
DROP POLICY IF EXISTS captain_register_team_members ON public.athlete_registrations;
CREATE POLICY captain_register_team_members
ON public.athlete_registrations
FOR INSERT
TO authenticated
WITH CHECK (
  registered_by_user_id = auth.uid()
  AND team_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.competition_teams t
    WHERE t.id = athlete_registrations.team_id AND t.captain_user_id = auth.uid()
  )
  AND public.is_registration_open(competition_id)
);

DROP POLICY IF EXISTS captain_update_team_members ON public.athlete_registrations;
CREATE POLICY captain_update_team_members
ON public.athlete_registrations
FOR UPDATE
TO authenticated
USING (
  team_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.competition_teams t
    WHERE t.id = athlete_registrations.team_id AND t.captain_user_id = auth.uid()
  )
  AND public.is_registration_open(competition_id)
);

DROP POLICY IF EXISTS captain_delete_team_members ON public.athlete_registrations;
CREATE POLICY captain_delete_team_members
ON public.athlete_registrations
FOR DELETE
TO authenticated
USING (
  team_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.competition_teams t
    WHERE t.id = athlete_registrations.team_id AND t.captain_user_id = auth.uid()
  )
  AND public.is_registration_open(competition_id)
);

-- Self-registration INSERT also locked by deadline (owner/super still bypass via separate clauses)
DROP POLICY IF EXISTS registrations_insert ON public.athlete_registrations;
CREATE POLICY registrations_insert
ON public.athlete_registrations
FOR INSERT
WITH CHECK (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR public.is_super_user(auth.uid())
  OR (user_id = auth.uid() AND public.is_registration_open(competition_id))
);