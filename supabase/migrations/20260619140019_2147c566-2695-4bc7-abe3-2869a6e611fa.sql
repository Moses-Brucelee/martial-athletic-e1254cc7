GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_teams TO authenticated;
GRANT SELECT ON public.competition_teams TO anon;
GRANT ALL ON public.competition_teams TO service_role;