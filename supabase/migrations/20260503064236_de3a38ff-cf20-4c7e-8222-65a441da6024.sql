-- Rename duplicates by appending row number suffix
WITH dups AS (
  SELECT id, team_name,
    row_number() OVER (PARTITION BY competition_id, lower(team_name) ORDER BY created_at) AS rn
  FROM public.competition_teams
)
UPDATE public.competition_teams ct
SET team_name = ct.team_name || ' (' || dups.rn || ')'
FROM dups
WHERE ct.id = dups.id AND dups.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS competition_teams_unique_name_per_comp
ON public.competition_teams (competition_id, lower(team_name));