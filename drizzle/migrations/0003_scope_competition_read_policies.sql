CREATE OR REPLACE FUNCTION public.can_view_competition(p_user_id uuid, p_competition_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.competitions c
    WHERE c.id = p_competition_id AND (
      (p_user_id IS NOT NULL AND (c.created_by = p_user_id OR public.is_super_user(p_user_id)
        OR public.is_competition_judge(p_user_id, c.id) OR public.is_competition_registrant(p_user_id, c.id)))
      OR (c.status NOT IN ('draft','unpublished') AND (COALESCE(c.visibility,'public') <> 'private'
        OR (p_user_id IS NOT NULL AND public.is_competition_gym_member(p_user_id, c.id))))
    )
  );
$$;

DROP POLICY IF EXISTS participants_select ON public.competition_participants;
CREATE POLICY participants_select ON public.competition_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_view_competition(auth.uid(), competition_id));

DROP POLICY IF EXISTS athletes_insert ON public.athletes;
CREATE POLICY athletes_insert ON public.athletes FOR INSERT TO authenticated
  WITH CHECK (created_by_user_id = auth.uid() OR user_id = auth.uid() OR public.is_super_user(auth.uid()));

DROP POLICY IF EXISTS comp_settings_select ON public.competition_settings;
CREATE POLICY comp_settings_select ON public.competition_settings FOR SELECT TO authenticated
  USING (public.can_view_competition(auth.uid(), competition_id));

DROP POLICY IF EXISTS heat_schedule_select ON public.heat_schedule;
CREATE POLICY heat_schedule_select ON public.heat_schedule FOR SELECT TO authenticated
  USING (public.can_view_competition(auth.uid(), competition_id));

DROP POLICY IF EXISTS heat_assignments_select ON public.heat_assignments;
CREATE POLICY heat_assignments_select ON public.heat_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.heat_schedule h WHERE h.id = heat_assignments.heat_id AND public.can_view_competition(auth.uid(), h.competition_id)));

DROP POLICY IF EXISTS heat_judges_select ON public.heat_judges;
CREATE POLICY heat_judges_select ON public.heat_judges FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.heat_schedule h WHERE h.id = heat_judges.heat_id AND public.can_view_competition(auth.uid(), h.competition_id)));

DROP POLICY IF EXISTS judges_select ON public.competition_judges;
CREATE POLICY judges_select ON public.competition_judges FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid())
    OR public.is_competition_judge(auth.uid(), competition_id) OR public.is_competition_registrant(auth.uid(), competition_id));

DROP POLICY IF EXISTS judge_assignments_select ON public.judge_assignments;
CREATE POLICY judge_assignments_select ON public.judge_assignments FOR SELECT TO authenticated
  USING (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()) OR public.is_competition_judge(auth.uid(), competition_id));

DROP POLICY IF EXISTS movements_select ON public.workout_movements;
CREATE POLICY movements_select ON public.workout_movements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.competition_workouts w WHERE w.id = workout_movements.workout_id AND public.can_view_competition(auth.uid(), w.competition_id)));

DROP POLICY IF EXISTS workout_configs_select ON public.workout_configs;
CREATE POLICY workout_configs_select ON public.workout_configs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.competition_workouts w WHERE w.id = workout_configs.workout_id AND public.can_view_competition(auth.uid(), w.competition_id)));

DROP POLICY IF EXISTS rounds_select ON public.competition_rounds;
CREATE POLICY rounds_select ON public.competition_rounds FOR SELECT TO authenticated
  USING (public.can_view_competition(auth.uid(), competition_id));

DROP POLICY IF EXISTS brackets_select ON public.brackets;
CREATE POLICY brackets_select ON public.brackets FOR SELECT TO authenticated
  USING (public.can_view_competition(auth.uid(), competition_id));

DROP POLICY IF EXISTS bouts_select ON public.bouts;
CREATE POLICY bouts_select ON public.bouts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brackets b WHERE b.id = bouts.bracket_id AND public.can_view_competition(auth.uid(), b.competition_id)));

DROP POLICY IF EXISTS season_comps_select ON public.season_competitions;
CREATE POLICY season_comps_select ON public.season_competitions FOR SELECT TO authenticated
  USING (public.can_view_competition(auth.uid(), competition_id));

DROP POLICY IF EXISTS templates_insert ON public.competition_templates;
CREATE POLICY templates_insert ON public.competition_templates FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS workout_rankings_select ON public.workout_rankings;
CREATE POLICY workout_rankings_select ON public.workout_rankings FOR SELECT
  USING (public.can_view_competition(auth.uid(), competition_id));

DROP POLICY IF EXISTS comp_leaderboards_select ON public.competition_leaderboards;
CREATE POLICY comp_leaderboards_select ON public.competition_leaderboards FOR SELECT
  USING (public.can_view_competition(auth.uid(), competition_id));