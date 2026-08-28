-- 1. New configuration columns
ALTER TABLE public.competition_settings
  ADD COLUMN IF NOT EXISTS global_tie_breaker text NOT NULL DEFAULT 'none';

ALTER TABLE public.competition_settings
  DROP CONSTRAINT IF EXISTS competition_settings_global_tie_breaker_check;
ALTER TABLE public.competition_settings
  ADD CONSTRAINT competition_settings_global_tie_breaker_check
  CHECK (global_tie_breaker IN ('none','most_wins_placements'));

ALTER TABLE public.competition_workouts
  ADD COLUMN IF NOT EXISTS tie_breaker_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS target_work numeric,
  ADD COLUMN IF NOT EXISTS target_unit text;

ALTER TABLE public.competition_workouts
  DROP CONSTRAINT IF EXISTS competition_workouts_tie_breaker_type_check;
ALTER TABLE public.competition_workouts
  ADD CONSTRAINT competition_workouts_tie_breaker_type_check
  CHECK (tie_breaker_type IN ('none','time'));

ALTER TABLE public.competition_workouts
  DROP CONSTRAINT IF EXISTS competition_workouts_target_work_check;
ALTER TABLE public.competition_workouts
  ADD CONSTRAINT competition_workouts_target_work_check
  CHECK (target_work IS NULL OR target_work > 0);

ALTER TABLE public.competition_scores
  ADD COLUMN IF NOT EXISTS tie_breaker_seconds integer,
  ADD COLUMN IF NOT EXISTS work_completed numeric;

ALTER TABLE public.competition_scores
  DROP CONSTRAINT IF EXISTS competition_scores_tie_breaker_seconds_check;
ALTER TABLE public.competition_scores
  ADD CONSTRAINT competition_scores_tie_breaker_seconds_check
  CHECK (tie_breaker_seconds IS NULL OR tie_breaker_seconds >= 0);

ALTER TABLE public.competition_scores
  DROP CONSTRAINT IF EXISTS competition_scores_work_completed_check;
ALTER TABLE public.competition_scores
  ADD CONSTRAINT competition_scores_work_completed_check
  CHECK (work_completed IS NULL OR work_completed >= 0);

-- 2. Workout rankings: completion-aware ordering, shared source of truth
CREATE OR REPLACE FUNCTION public.recompute_workout_rankings(p_competition_id uuid, p_workout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_scoring_type text;
  v_target numeric;
  v_tb text;
BEGIN
  SELECT scoring_type, target_work, tie_breaker_type
    INTO v_scoring_type, v_target, v_tb
  FROM public.competition_workouts
  WHERE id = p_workout_id;

  DELETE FROM public.workout_rankings WHERE workout_id = p_workout_id;

  INSERT INTO public.workout_rankings (competition_id, workout_id, team_id, division_id, normalized_score, rank, points_earned, recomputed_at)
  SELECT
    r.competition_id,
    r.workout_id,
    r.team_id,
    r.division_id,
    r.normalized_score,
    r.rank,
    GREATEST(100 - (r.rank - 1) * 5, 0),
    now()
  FROM (
    SELECT
      s.competition_id,
      s.workout_id,
      s.team_id,
      t.division_id,
      CASE
        WHEN v_scoring_type = 'time' THEN COALESCE(s.time_seconds::numeric, s.score)
        WHEN v_scoring_type = 'reps' THEN COALESCE(s.reps_completed::numeric, s.score)
        WHEN v_scoring_type = 'load' THEN COALESCE(s.load_value, s.score)
        ELSE COALESCE(s.points_awarded::numeric, s.score)
      END AS normalized_score,
      dense_rank() OVER (
        PARTITION BY s.workout_id, t.division_id
        ORDER BY
          -- completed teams first (only meaningful for For Time with a target)
          CASE
            WHEN v_scoring_type = 'time' AND v_target IS NOT NULL
              THEN CASE WHEN COALESCE(s.work_completed, 0) >= v_target THEN 0 ELSE 1 END
            ELSE 0
          END ASC,
          -- primary metric
          CASE
            WHEN v_scoring_type = 'time' AND v_target IS NOT NULL AND COALESCE(s.work_completed, 0) < v_target
              THEN -COALESCE(s.work_completed, 0)
            WHEN v_scoring_type = 'time' THEN COALESCE(s.time_seconds::numeric, s.score)
            WHEN v_scoring_type = 'reps' THEN -COALESCE(s.reps_completed::numeric, s.score)
            WHEN v_scoring_type = 'load' THEN -COALESCE(s.load_value, s.score)
            ELSE -COALESCE(s.points_awarded::numeric, s.score)
          END ASC,
          -- workout tie breaker (only when configured)
          CASE WHEN v_tb = 'time' THEN s.tie_breaker_seconds END ASC NULLS LAST
      ) AS rank
    FROM public.competition_scores s
    JOIN public.competition_teams t ON t.id = s.team_id
    WHERE s.competition_id = p_competition_id
      AND s.workout_id = p_workout_id
      AND (s.validation_status IS NULL OR s.validation_status <> 'rejected')
  ) r;
END;
$function$;

-- 3. Competition leaderboard: same ordering + global tie breaker
DROP FUNCTION IF EXISTS public.get_competition_leaderboard(uuid);

CREATE OR REPLACE FUNCTION public.get_competition_leaderboard(p_competition_id uuid)
RETURNS TABLE(
  division_id uuid,
  division_name text,
  team_id uuid,
  team_name text,
  total_points numeric,
  overall_rank integer,
  wins integer,
  placement_counts integer[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_global text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.competitions
    WHERE id = p_competition_id
      AND (created_by = auth.uid() OR status <> 'draft')
  ) THEN
    RETURN;
  END IF;

  SELECT COALESCE(cs.global_tie_breaker, 'none') INTO v_global
  FROM public.competition_settings cs
  WHERE cs.competition_id = p_competition_id;
  v_global := COALESCE(v_global, 'none');

  RETURN QUERY
  WITH workout_ranks AS (
    SELECT
      s.team_id,
      s.workout_id,
      t.division_id,
      dense_rank() OVER (
        PARTITION BY s.workout_id, t.division_id
        ORDER BY
          CASE
            WHEN w.scoring_type = 'time' AND w.target_work IS NOT NULL
              THEN CASE WHEN COALESCE(s.work_completed, 0) >= w.target_work THEN 0 ELSE 1 END
            ELSE 0
          END ASC,
          CASE
            WHEN w.scoring_type = 'time' AND w.target_work IS NOT NULL AND COALESCE(s.work_completed, 0) < w.target_work
              THEN -COALESCE(s.work_completed, 0)
            WHEN w.scoring_type = 'time' THEN COALESCE(s.time_seconds::numeric, s.score)
            WHEN w.scoring_type = 'reps' THEN -COALESCE(s.reps_completed::numeric, s.score)
            WHEN w.scoring_type = 'load' THEN -COALESCE(s.load_value, s.score)
            ELSE -COALESCE(s.points_awarded::numeric, s.score)
          END ASC,
          CASE WHEN w.tie_breaker_type = 'time' THEN s.tie_breaker_seconds END ASC NULLS LAST
      ) AS rank
    FROM public.competition_scores s
    JOIN public.competition_workouts w ON w.id = s.workout_id
    JOIN public.competition_teams t ON t.id = s.team_id
    WHERE s.competition_id = p_competition_id
      AND (s.validation_status IS NULL OR s.validation_status <> 'rejected')
  ),
  agg AS (
    SELECT
      wr.team_id,
      wr.division_id,
      SUM(GREATEST(100 - (wr.rank - 1) * 5, 0))::numeric AS total_pts,
      COUNT(*) FILTER (WHERE wr.rank = 1)::int AS wins,
      (
        SELECT COALESCE(array_agg(cnt ORDER BY pos), ARRAY[]::integer[])
        FROM (
          SELECT p.pos, COUNT(*) FILTER (WHERE wr2.rank = p.pos)::int AS cnt
          FROM generate_series(1, 20) AS p(pos)
          LEFT JOIN workout_ranks wr2
            ON wr2.team_id = wr.team_id AND wr2.division_id IS NOT DISTINCT FROM wr.division_id
          GROUP BY p.pos
        ) counts
      ) AS placements
    FROM workout_ranks wr
    GROUP BY wr.team_id, wr.division_id
  ),
  base AS (
    SELECT
      t.division_id AS div_id,
      d.name AS div_name,
      d.sort_order AS div_sort,
      t.id AS tid,
      t.team_name AS tname,
      COALESCE(a.total_pts, 0) AS pts,
      COALESCE(a.wins, 0) AS win_count,
      COALESCE(a.placements, ARRAY[]::integer[]) AS placements
    FROM public.competition_teams t
    LEFT JOIN public.competition_divisions d ON d.id = t.division_id
    LEFT JOIN agg a ON a.team_id = t.id
    WHERE t.competition_id = p_competition_id
  )
  SELECT
    b.div_id,
    b.div_name,
    b.tid,
    b.tname,
    b.pts,
    (CASE
      WHEN v_global = 'most_wins_placements' THEN
        dense_rank() OVER (PARTITION BY b.div_id ORDER BY b.pts DESC, b.placements DESC)
      ELSE
        dense_rank() OVER (PARTITION BY b.div_id ORDER BY b.pts DESC)
    END)::int AS overall_rank,
    b.win_count::int,
    b.placements
  FROM base b
  ORDER BY COALESCE(b.div_sort, 999999) ASC, 6 ASC, b.tname ASC;
END;
$function$;