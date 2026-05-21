CREATE OR REPLACE FUNCTION public.get_competition_leaderboard(p_competition_id uuid)
 RETURNS TABLE(division_id uuid, division_name text, team_id uuid, team_name text, total_points numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.competitions
    WHERE id = p_competition_id
      AND (created_by = auth.uid() OR status != 'draft')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
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
          dense_rank() OVER (PARTITION BY ws.workout_id, ws.division_id ORDER BY ws.normalized_score ASC)
        ELSE
          dense_rank() OVER (PARTITION BY ws.workout_id, ws.division_id ORDER BY ws.normalized_score DESC)
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
END;
$function$;