
-- Layer 1: Subscription enforcement at the database level

-- 1. Create has_competition_access function
CREATE OR REPLACE FUNCTION public.has_competition_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subscriptions us
    JOIN public.pricing_tiers pt ON pt.id = us.tier_id
    WHERE us.user_id = p_user_id
      AND us.status = 'active'
      AND pt.key IN ('affiliate_pro', 'tournament_pro')
  )
  OR public.is_super_user(p_user_id);
$$;

-- 2. Update competitions INSERT policy
DROP POLICY IF EXISTS "Users can create their own competitions" ON public.competitions;
CREATE POLICY "Users can create their own competitions"
ON public.competitions FOR INSERT
WITH CHECK (auth.uid() = created_by AND public.has_competition_access(auth.uid()));

-- 3. Update competition_teams policies
DROP POLICY IF EXISTS "teams_insert" ON public.competition_teams;
CREATE POLICY "teams_insert" ON public.competition_teams FOR INSERT
WITH CHECK (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR public.is_super_user(auth.uid())
);

DROP POLICY IF EXISTS "teams_update" ON public.competition_teams;
CREATE POLICY "teams_update" ON public.competition_teams FOR UPDATE
USING (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR public.is_super_user(auth.uid())
);

DROP POLICY IF EXISTS "teams_delete" ON public.competition_teams;
CREATE POLICY "teams_delete" ON public.competition_teams FOR DELETE
USING (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR public.is_super_user(auth.uid())
);

-- 4. Update competition_workouts policies
DROP POLICY IF EXISTS "workouts_insert" ON public.competition_workouts;
CREATE POLICY "workouts_insert" ON public.competition_workouts FOR INSERT
WITH CHECK (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR public.is_super_user(auth.uid())
);

DROP POLICY IF EXISTS "workouts_update" ON public.competition_workouts;
CREATE POLICY "workouts_update" ON public.competition_workouts FOR UPDATE
USING (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR public.is_super_user(auth.uid())
);

DROP POLICY IF EXISTS "workouts_delete" ON public.competition_workouts;
CREATE POLICY "workouts_delete" ON public.competition_workouts FOR DELETE
USING (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR public.is_super_user(auth.uid())
);

-- 5. Update competition_divisions policies
DROP POLICY IF EXISTS "divisions_insert" ON public.competition_divisions;
CREATE POLICY "divisions_insert" ON public.competition_divisions FOR INSERT
WITH CHECK (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR public.is_super_user(auth.uid())
);

DROP POLICY IF EXISTS "divisions_update" ON public.competition_divisions;
CREATE POLICY "divisions_update" ON public.competition_divisions FOR UPDATE
USING (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR public.is_super_user(auth.uid())
);

DROP POLICY IF EXISTS "divisions_delete" ON public.competition_divisions;
CREATE POLICY "divisions_delete" ON public.competition_divisions FOR DELETE
USING (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR public.is_super_user(auth.uid())
);

-- 6. Update competition_judges policies
DROP POLICY IF EXISTS "judges_insert" ON public.competition_judges;
CREATE POLICY "judges_insert" ON public.competition_judges FOR INSERT
WITH CHECK (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR public.is_super_user(auth.uid())
);

DROP POLICY IF EXISTS "judges_delete" ON public.competition_judges;
CREATE POLICY "judges_delete" ON public.competition_judges FOR DELETE
USING (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR public.is_super_user(auth.uid())
);

-- 7. Update competition_participants policies (preserve self-registration)
DROP POLICY IF EXISTS "participants_insert" ON public.competition_participants;
CREATE POLICY "participants_insert" ON public.competition_participants FOR INSERT
WITH CHECK (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR (user_id = auth.uid())
  OR public.is_super_user(auth.uid())
);

DROP POLICY IF EXISTS "participants_update" ON public.competition_participants;
CREATE POLICY "participants_update" ON public.competition_participants FOR UPDATE
USING (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR public.is_super_user(auth.uid())
);

DROP POLICY IF EXISTS "participants_delete" ON public.competition_participants;
CREATE POLICY "participants_delete" ON public.competition_participants FOR DELETE
USING (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR public.is_super_user(auth.uid())
);

-- 8. Update competition_scores policies
DROP POLICY IF EXISTS "scores_insert" ON public.competition_scores;
CREATE POLICY "scores_insert" ON public.competition_scores FOR INSERT
WITH CHECK (
  public.is_super_user(auth.uid())
  OR (
    (public.is_competition_owner(auth.uid(), competition_id) OR public.is_competition_judge(auth.uid(), competition_id))
    AND public.has_competition_access(auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM competition_workouts w
      WHERE w.id = competition_scores.workout_id AND w.is_locked = true
    )
  )
);

DROP POLICY IF EXISTS "scores_update" ON public.competition_scores;
CREATE POLICY "scores_update" ON public.competition_scores FOR UPDATE
USING (
  public.is_super_user(auth.uid())
  OR (
    (public.is_competition_owner(auth.uid(), competition_id) OR public.is_competition_judge(auth.uid(), competition_id))
    AND public.has_competition_access(auth.uid())
    AND locked = false
    AND NOT EXISTS (
      SELECT 1 FROM competition_workouts w
      WHERE w.id = competition_scores.workout_id AND w.is_locked = true
    )
  )
);

DROP POLICY IF EXISTS "scores_delete" ON public.competition_scores;
CREATE POLICY "scores_delete" ON public.competition_scores FOR DELETE
USING (
  (public.is_competition_owner(auth.uid(), competition_id) AND public.has_competition_access(auth.uid()))
  OR public.is_super_user(auth.uid())
);
