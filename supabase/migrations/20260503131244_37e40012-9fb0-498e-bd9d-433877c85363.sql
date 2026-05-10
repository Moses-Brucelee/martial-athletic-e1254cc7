
-- Allow anonymous users to view non-draft competitions (public event page)
DROP POLICY IF EXISTS "Users can view all competitions" ON public.competitions;
CREATE POLICY "View competitions (public for non-draft)"
  ON public.competitions FOR SELECT
  USING (auth.uid() IS NOT NULL OR status <> 'draft');

-- Public read for related tables on event page when parent competition is non-draft
DROP POLICY IF EXISTS "Authenticated users can view teams" ON public.competition_teams;
CREATE POLICY "View teams (public for non-draft comps)"
  ON public.competition_teams FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    OR EXISTS (SELECT 1 FROM public.competitions c WHERE c.id = competition_id AND c.status <> 'draft')
  );

DROP POLICY IF EXISTS divisions_select ON public.competition_divisions;
CREATE POLICY divisions_select ON public.competition_divisions FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    OR EXISTS (SELECT 1 FROM public.competitions c WHERE c.id = competition_id AND c.status <> 'draft')
  );

DROP POLICY IF EXISTS "Authenticated users can view workouts" ON public.competition_workouts;
CREATE POLICY "View workouts (public for non-draft comps)"
  ON public.competition_workouts FOR SELECT
  USING (
    is_competition_owner(auth.uid(), competition_id)
    OR is_super_user(auth.uid())
    OR is_competition_judge(auth.uid(), competition_id)
    OR (
      (visibility = 'visible' OR (visibility = 'scheduled' AND scheduled_reveal_at IS NOT NULL AND now() >= scheduled_reveal_at))
      AND EXISTS (SELECT 1 FROM public.competitions c WHERE c.id = competition_id AND c.status <> 'draft')
    )
  );

DROP POLICY IF EXISTS registrations_select ON public.athlete_registrations;
CREATE POLICY registrations_select ON public.athlete_registrations FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    OR EXISTS (SELECT 1 FROM public.competitions c WHERE c.id = competition_id AND c.status <> 'draft')
  );
