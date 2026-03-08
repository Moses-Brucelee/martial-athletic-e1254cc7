-- ============================================================
-- PHASE 1: Production Competition Engine Schema
-- ============================================================

-- 1. Competition Types (seed table)
CREATE TABLE IF NOT EXISTS public.competition_types (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.competition_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competition_types_select" ON public.competition_types FOR SELECT USING (true);

-- 2. Competition Settings
CREATE TABLE IF NOT EXISTS public.competition_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE UNIQUE,
  timezone text NOT NULL DEFAULT 'UTC',
  scoring_method text NOT NULL DEFAULT 'rank_sum',
  tie_breaker_policy text NOT NULL DEFAULT 'best_final_round',
  allow_remote_submissions boolean NOT NULL DEFAULT false,
  require_video_verification boolean NOT NULL DEFAULT false,
  auto_publish_leaderboard boolean NOT NULL DEFAULT true,
  settings_json jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.competition_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comp_settings_select" ON public.competition_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "comp_settings_insert" ON public.competition_settings FOR INSERT WITH CHECK (is_competition_owner(auth.uid(), competition_id) OR is_super_user(auth.uid()));
CREATE POLICY "comp_settings_update" ON public.competition_settings FOR UPDATE USING (is_competition_owner(auth.uid(), competition_id) OR is_super_user(auth.uid()));
CREATE POLICY "comp_settings_delete" ON public.competition_settings FOR DELETE USING (is_competition_owner(auth.uid(), competition_id) OR is_super_user(auth.uid()));

-- 3. Competition Rounds
CREATE TABLE IF NOT EXISTS public.competition_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  name text NOT NULL,
  round_number integer NOT NULL,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  status text NOT NULL DEFAULT 'pending',
  scoring_weight numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, round_number)
);
ALTER TABLE public.competition_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rounds_select" ON public.competition_rounds FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "rounds_insert" ON public.competition_rounds FOR INSERT WITH CHECK (is_competition_owner(auth.uid(), competition_id) OR is_super_user(auth.uid()));
CREATE POLICY "rounds_update" ON public.competition_rounds FOR UPDATE USING (is_competition_owner(auth.uid(), competition_id) OR is_super_user(auth.uid()));
CREATE POLICY "rounds_delete" ON public.competition_rounds FOR DELETE USING (is_competition_owner(auth.uid(), competition_id) OR is_super_user(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_rounds_competition ON public.competition_rounds (competition_id, round_number);

-- 4. Add round_id to competition_workouts
ALTER TABLE public.competition_workouts ADD COLUMN IF NOT EXISTS round_id uuid REFERENCES public.competition_rounds(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_workouts_round ON public.competition_workouts (round_id);

-- 5. Workout Configs (jsonb)
CREATE TABLE IF NOT EXISTS public.workout_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.competition_workouts(id) ON DELETE CASCADE UNIQUE,
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workout_configs_select" ON public.workout_configs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "workout_configs_insert" ON public.workout_configs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.competition_workouts w WHERE w.id = workout_configs.workout_id AND (is_competition_owner(auth.uid(), w.competition_id) OR is_super_user(auth.uid()))));
CREATE POLICY "workout_configs_update" ON public.workout_configs FOR UPDATE USING (EXISTS (SELECT 1 FROM public.competition_workouts w WHERE w.id = workout_configs.workout_id AND (is_competition_owner(auth.uid(), w.competition_id) OR is_super_user(auth.uid()))));
CREATE POLICY "workout_configs_delete" ON public.workout_configs FOR DELETE USING (EXISTS (SELECT 1 FROM public.competition_workouts w WHERE w.id = workout_configs.workout_id AND (is_competition_owner(auth.uid(), w.competition_id) OR is_super_user(auth.uid()))));

-- 6. Heat Schedule
CREATE TABLE IF NOT EXISTS public.heat_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  workout_id uuid REFERENCES public.competition_workouts(id) ON DELETE CASCADE,
  round_id uuid REFERENCES public.competition_rounds(id) ON DELETE SET NULL,
  heat_number integer NOT NULL,
  lane_count integer NOT NULL DEFAULT 10,
  scheduled_start timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, workout_id, heat_number)
);
ALTER TABLE public.heat_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "heat_schedule_select" ON public.heat_schedule FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "heat_schedule_insert" ON public.heat_schedule FOR INSERT WITH CHECK (is_competition_owner(auth.uid(), competition_id) OR is_super_user(auth.uid()));
CREATE POLICY "heat_schedule_update" ON public.heat_schedule FOR UPDATE USING (is_competition_owner(auth.uid(), competition_id) OR is_super_user(auth.uid()));
CREATE POLICY "heat_schedule_delete" ON public.heat_schedule FOR DELETE USING (is_competition_owner(auth.uid(), competition_id) OR is_super_user(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_heat_schedule_comp ON public.heat_schedule (competition_id, workout_id);

-- 7. Heat Assignments
CREATE TABLE IF NOT EXISTS public.heat_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  heat_id uuid NOT NULL REFERENCES public.heat_schedule(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.competition_teams(id) ON DELETE CASCADE,
  lane_number integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (heat_id, team_id)
);
ALTER TABLE public.heat_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "heat_assignments_select" ON public.heat_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "heat_assignments_insert" ON public.heat_assignments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.heat_schedule h WHERE h.id = heat_assignments.heat_id AND (is_competition_owner(auth.uid(), h.competition_id) OR is_super_user(auth.uid()))));
CREATE POLICY "heat_assignments_update" ON public.heat_assignments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.heat_schedule h WHERE h.id = heat_assignments.heat_id AND (is_competition_owner(auth.uid(), h.competition_id) OR is_super_user(auth.uid()))));
CREATE POLICY "heat_assignments_delete" ON public.heat_assignments FOR DELETE USING (EXISTS (SELECT 1 FROM public.heat_schedule h WHERE h.id = heat_assignments.heat_id AND (is_competition_owner(auth.uid(), h.competition_id) OR is_super_user(auth.uid()))));
CREATE INDEX IF NOT EXISTS idx_heat_assignments_heat ON public.heat_assignments (heat_id);

-- 8. Judge Assignments
CREATE TABLE IF NOT EXISTS public.judge_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL,
  heat_id uuid REFERENCES public.heat_schedule(id) ON DELETE SET NULL,
  workout_id uuid REFERENCES public.competition_workouts(id) ON DELETE SET NULL,
  lane_number integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (judge_id, heat_id)
);
ALTER TABLE public.judge_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "judge_assignments_select" ON public.judge_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "judge_assignments_insert" ON public.judge_assignments FOR INSERT WITH CHECK (is_competition_owner(auth.uid(), competition_id) OR is_super_user(auth.uid()));
CREATE POLICY "judge_assignments_update" ON public.judge_assignments FOR UPDATE USING (is_competition_owner(auth.uid(), competition_id) OR is_super_user(auth.uid()));
CREATE POLICY "judge_assignments_delete" ON public.judge_assignments FOR DELETE USING (is_competition_owner(auth.uid(), competition_id) OR is_super_user(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_judge_assignments_comp ON public.judge_assignments (competition_id);

-- 9. Enhance competition_scores
ALTER TABLE public.competition_scores
  ADD COLUMN IF NOT EXISTS heat_id uuid REFERENCES public.heat_schedule(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS round_id uuid REFERENCES public.competition_rounds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS normalized_score numeric,
  ADD COLUMN IF NOT EXISTS rank integer,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_notes text,
  ADD COLUMN IF NOT EXISTS validation_status text DEFAULT 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_idempotency ON public.competition_scores (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scores_heat ON public.competition_scores (heat_id);
CREATE INDEX IF NOT EXISTS idx_scores_round ON public.competition_scores (round_id);
CREATE INDEX IF NOT EXISTS idx_scores_validation ON public.competition_scores (competition_id, validation_status);

-- 10. Workout Rankings (derived/cached)
CREATE TABLE IF NOT EXISTS public.workout_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  workout_id uuid NOT NULL REFERENCES public.competition_workouts(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.competition_teams(id) ON DELETE CASCADE,
  division_id uuid REFERENCES public.competition_divisions(id) ON DELETE SET NULL,
  normalized_score numeric NOT NULL DEFAULT 0,
  rank integer NOT NULL DEFAULT 0,
  points_earned numeric NOT NULL DEFAULT 0,
  recomputed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workout_id, team_id)
);
ALTER TABLE public.workout_rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workout_rankings_select" ON public.workout_rankings FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_workout_rankings_comp ON public.workout_rankings (competition_id);
CREATE INDEX IF NOT EXISTS idx_workout_rankings_workout ON public.workout_rankings (workout_id, rank);

-- 11. Competition Leaderboards (cached)
CREATE TABLE IF NOT EXISTS public.competition_leaderboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  division_id uuid REFERENCES public.competition_divisions(id) ON DELETE SET NULL,
  team_id uuid NOT NULL REFERENCES public.competition_teams(id) ON DELETE CASCADE,
  total_rank_sum numeric NOT NULL DEFAULT 0,
  overall_rank integer NOT NULL DEFAULT 0,
  tie_broken_by text,
  recomputed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, team_id)
);
ALTER TABLE public.competition_leaderboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comp_leaderboards_select" ON public.competition_leaderboards FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_comp_leaderboards_comp ON public.competition_leaderboards (competition_id, overall_rank);

-- 12. Leaderboard History (snapshots)
CREATE TABLE IF NOT EXISTS public.leaderboard_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  snapshot_data jsonb NOT NULL,
  triggered_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.leaderboard_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leaderboard_history_select" ON public.leaderboard_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_comp ON public.leaderboard_history (competition_id, created_at DESC);

-- 13. Competition Audit Events (immutable log)
CREATE TABLE IF NOT EXISTS public.competition_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  payload jsonb DEFAULT '{}',
  device_id text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.competition_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_events_select" ON public.competition_audit_events FOR SELECT USING (is_competition_owner(auth.uid(), competition_id) OR is_super_user(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_audit_events_comp ON public.competition_audit_events (competition_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON public.competition_audit_events (competition_id, event_type);

-- 14. Competition Templates
CREATE TABLE IF NOT EXISTS public.competition_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  competition_type text NOT NULL DEFAULT 'crossfit',
  description text,
  template_data jsonb NOT NULL DEFAULT '{}',
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.competition_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_select" ON public.competition_templates FOR SELECT USING (is_public = true OR created_by = auth.uid() OR is_super_user(auth.uid()));
CREATE POLICY "templates_insert" ON public.competition_templates FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "templates_update" ON public.competition_templates FOR UPDATE USING (created_by = auth.uid() OR is_super_user(auth.uid()));
CREATE POLICY "templates_delete" ON public.competition_templates FOR DELETE USING (created_by = auth.uid() OR is_super_user(auth.uid()));

-- 15. Add competition_type to competitions
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS competition_type text DEFAULT 'crossfit';
CREATE INDEX IF NOT EXISTS idx_competitions_type ON public.competitions (competition_type);

-- 16. Recompute leaderboard function (service role)
CREATE OR REPLACE FUNCTION public.recompute_workout_rankings(p_competition_id uuid, p_workout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_scoring_type text;
BEGIN
  SELECT scoring_type INTO v_scoring_type
  FROM public.competition_workouts
  WHERE id = p_workout_id;

  -- Delete existing rankings for this workout
  DELETE FROM public.workout_rankings WHERE workout_id = p_workout_id;

  -- Insert new rankings using window functions
  INSERT INTO public.workout_rankings (competition_id, workout_id, team_id, division_id, normalized_score, rank, points_earned, recomputed_at)
  SELECT
    s.competition_id,
    s.workout_id,
    s.team_id,
    t.division_id,
    CASE
      WHEN v_scoring_type = 'time' THEN COALESCE(s.time_seconds, s.score)
      WHEN v_scoring_type = 'reps' THEN COALESCE(s.reps_completed, s.score)
      WHEN v_scoring_type = 'load' THEN COALESCE(s.load_value, s.score)
      ELSE COALESCE(s.points_awarded, s.score)
    END AS normalized_score,
    CASE
      WHEN v_scoring_type = 'time' THEN
        dense_rank() OVER (ORDER BY COALESCE(s.time_seconds, s.score) ASC)
      ELSE
        dense_rank() OVER (ORDER BY CASE
          WHEN v_scoring_type = 'reps' THEN COALESCE(s.reps_completed, s.score)
          WHEN v_scoring_type = 'load' THEN COALESCE(s.load_value, s.score)
          ELSE COALESCE(s.points_awarded, s.score)
        END DESC)
    END AS rank,
    0 AS points_earned,
    now()
  FROM public.competition_scores s
  JOIN public.competition_teams t ON t.id = s.team_id
  WHERE s.competition_id = p_competition_id
    AND s.workout_id = p_workout_id
    AND (s.validation_status IS NULL OR s.validation_status != 'rejected');
END;
$$;

-- 17. Recompute full competition leaderboard
CREATE OR REPLACE FUNCTION public.recompute_competition_leaderboard(p_competition_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Snapshot current leaderboard before recompute
  INSERT INTO public.leaderboard_history (competition_id, snapshot_data, triggered_by)
  SELECT p_competition_id,
    COALESCE(
      (SELECT jsonb_agg(row_to_json(cl)) FROM public.competition_leaderboards cl WHERE cl.competition_id = p_competition_id),
      '[]'::jsonb
    ),
    'recompute';

  -- Delete existing leaderboard
  DELETE FROM public.competition_leaderboards WHERE competition_id = p_competition_id;

  -- Recompute: rank-sum method
  INSERT INTO public.competition_leaderboards (competition_id, division_id, team_id, total_rank_sum, overall_rank, recomputed_at)
  SELECT
    p_competition_id,
    t.division_id,
    t.id AS team_id,
    COALESCE(SUM(wr.rank), 0) AS total_rank_sum,
    dense_rank() OVER (ORDER BY COALESCE(SUM(wr.rank), 0) ASC) AS overall_rank,
    now()
  FROM public.competition_teams t
  LEFT JOIN public.workout_rankings wr ON wr.team_id = t.id AND wr.competition_id = p_competition_id
  WHERE t.competition_id = p_competition_id
  GROUP BY t.id, t.division_id;
END;
$$;

-- 18. Enable realtime for key tables
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_rankings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_leaderboards;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.heat_schedule;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;