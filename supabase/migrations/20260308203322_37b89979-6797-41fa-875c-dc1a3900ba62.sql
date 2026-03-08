
-- Extend workout_movements with additional CrossFit fields
ALTER TABLE public.workout_movements
  ADD COLUMN IF NOT EXISTS distance numeric NULL,
  ADD COLUMN IF NOT EXISTS calories integer NULL,
  ADD COLUMN IF NOT EXISTS target_height numeric NULL,
  ADD COLUMN IF NOT EXISTS box_height numeric NULL,
  ADD COLUMN IF NOT EXISTS description text NULL,
  ADD COLUMN IF NOT EXISTS video_url text NULL;

-- Extend competition_workouts with description and display_order
ALTER TABLE public.competition_workouts
  ADD COLUMN IF NOT EXISTS description text NULL,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Update the leaderboard RPC to use CrossFit-style rank-based point system
CREATE OR REPLACE FUNCTION public.get_competition_leaderboard(p_competition_id uuid)
RETURNS TABLE(division_id uuid, division_name text, team_id uuid, team_name text, total_points numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH workout_scores AS (
    SELECT
      s.team_id,
      s.workout_id,
      t.division_id,
      CASE
        WHEN w.scoring_type = 'time' THEN COALESCE(s.time_seconds::numeric, s.score)
        WHEN w.scoring_type = 'reps' THEN COALESCE(s.reps_completed::numeric, s.score)
        WHEN w.scoring_type = 'load' THEN COALESCE(s.load_value, s.score)
        ELSE COALESCE(s.points_awarded::numeric, s.score)
      END AS normalized_score,
      w.scoring_type
    FROM competition_scores s
    JOIN competition_workouts w ON w.id = s.workout_id
    JOIN competition_teams t ON t.id = s.team_id
    WHERE s.competition_id = p_competition_id
      AND (s.validation_status IS NULL OR s.validation_status != 'rejected')
  ),
  workout_ranks AS (
    SELECT
      ws.team_id,
      ws.workout_id,
      ws.division_id,
      CASE
        WHEN ws.scoring_type = 'time' THEN
          dense_rank() OVER (PARTITION BY ws.workout_id ORDER BY ws.normalized_score ASC)
        ELSE
          dense_rank() OVER (PARTITION BY ws.workout_id ORDER BY ws.normalized_score DESC)
      END AS rank
    FROM workout_scores ws
  ),
  rank_points AS (
    SELECT
      wr.team_id,
      wr.division_id,
      SUM(GREATEST(100 - (wr.rank - 1) * 5, 0)) AS total_pts
    FROM workout_ranks wr
    GROUP BY wr.team_id, wr.division_id
  )
  SELECT
    d.id AS division_id,
    d.name AS division_name,
    t.id AS team_id,
    t.team_name,
    COALESCE(rp.total_pts, 0) AS total_points
  FROM competition_teams t
  LEFT JOIN competition_divisions d ON d.id = t.division_id
  LEFT JOIN rank_points rp ON rp.team_id = t.id
  WHERE t.competition_id = p_competition_id
  ORDER BY COALESCE(d.sort_order, 999999) ASC, COALESCE(rp.total_pts, 0) DESC;
$$;

-- Update recompute_workout_rankings to handle division-specific ranking and point assignment
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

  DELETE FROM public.workout_rankings WHERE workout_id = p_workout_id;

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
    GREATEST(100 - (
      CASE
        WHEN v_scoring_type = 'time' THEN
          dense_rank() OVER (ORDER BY COALESCE(s.time_seconds, s.score) ASC)
        ELSE
          dense_rank() OVER (ORDER BY CASE
            WHEN v_scoring_type = 'reps' THEN COALESCE(s.reps_completed, s.score)
            WHEN v_scoring_type = 'load' THEN COALESCE(s.load_value, s.score)
            ELSE COALESCE(s.points_awarded, s.score)
          END DESC)
      END - 1) * 5, 0) AS points_earned,
    now()
  FROM public.competition_scores s
  JOIN public.competition_teams t ON t.id = s.team_id
  WHERE s.competition_id = p_competition_id
    AND s.workout_id = p_workout_id
    AND (s.validation_status IS NULL OR s.validation_status != 'rejected');
END;
$$;
