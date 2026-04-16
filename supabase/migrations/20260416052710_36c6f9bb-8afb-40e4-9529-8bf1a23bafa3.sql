
-- 1. Remove overly broad competition-posters storage policies
DROP POLICY IF EXISTS "Users can delete their competition posters" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their competition posters" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload competition posters" ON storage.objects;

-- 2. Restrict super_users SELECT to only super users themselves
DROP POLICY IF EXISTS "super_users_select" ON public.super_users;
CREATE POLICY "super_users_select" ON public.super_users
  FOR SELECT TO authenticated
  USING (public.is_super_user(auth.uid()));

-- 3. Tighten athletes SELECT policy to owner/creator/competition context
DROP POLICY IF EXISTS "athletes_select" ON public.athletes;
CREATE POLICY "athletes_select" ON public.athletes
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR created_by_user_id = auth.uid()
    OR public.is_super_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.athlete_registrations ar
      JOIN public.competitions c ON c.id = ar.competition_id
      WHERE ar.athlete_id = athletes.id
        AND (c.created_by = auth.uid() OR public.is_competition_judge(auth.uid(), c.id))
    )
  );

-- 4. Update leaderboard RPCs to filter out draft competitions for non-owners
CREATE OR REPLACE FUNCTION public.get_competition_leaderboard(p_competition_id uuid)
 RETURNS TABLE(division_id uuid, division_name text, team_id uuid, team_name text, total_points numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Block access to draft competitions for non-owners
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
END;
$$;

CREATE OR REPLACE FUNCTION public.get_season_leaderboard(p_season_id uuid)
 RETURNS TABLE(team_id uuid, team_name text, total_points numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.team_name, COALESCE(SUM(s.score), 0)
  FROM public.season_competitions sc
  JOIN public.competitions c ON c.id = sc.competition_id
  JOIN public.competition_scores s ON s.competition_id = sc.competition_id
  JOIN public.competition_teams t ON t.id = s.team_id
  WHERE sc.season_id = p_season_id
    AND c.status != 'draft'
  GROUP BY t.id, t.team_name
  ORDER BY COALESCE(SUM(s.score), 0) DESC;
END;
$$;
