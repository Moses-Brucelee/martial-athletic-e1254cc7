-- Backfill captain_user_id on legacy teams using earliest team_captain registration
UPDATE public.competition_teams t
SET captain_user_id = sub.user_id
FROM (
  SELECT DISTINCT ON (ar.team_id) ar.team_id, ar.user_id
  FROM public.athlete_registrations ar
  WHERE ar.team_id IS NOT NULL
    AND ar.user_id IS NOT NULL
    AND ar.registration_type = 'team_captain'
    AND ar.status NOT IN ('withdrawn', 'rejected', 'removed')
  ORDER BY ar.team_id, ar.created_at ASC
) sub
WHERE t.id = sub.team_id
  AND t.captain_user_id IS NULL;

-- Fallback: if no team_captain entry, use earliest active registration user
UPDATE public.competition_teams t
SET captain_user_id = sub.user_id
FROM (
  SELECT DISTINCT ON (ar.team_id) ar.team_id, ar.user_id
  FROM public.athlete_registrations ar
  WHERE ar.team_id IS NOT NULL
    AND ar.user_id IS NOT NULL
    AND ar.status NOT IN ('withdrawn', 'rejected', 'removed')
  ORDER BY ar.team_id, ar.created_at ASC
) sub
WHERE t.id = sub.team_id
  AND t.captain_user_id IS NULL;