-- Allow authenticated users to create a team where they are captain (for public team registration)
CREATE POLICY "users_create_team_as_captain"
ON public.competition_teams
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = captain_user_id);

-- Allow team captain to update their own team (rename, mark complete)
CREATE POLICY "captain_update_own_team"
ON public.competition_teams
FOR UPDATE
TO authenticated
USING (auth.uid() = captain_user_id);

-- Allow team captain to register additional athletes onto their team
CREATE POLICY "captain_register_team_members"
ON public.athlete_registrations
FOR INSERT
TO authenticated
WITH CHECK (
  registered_by_user_id = auth.uid()
  AND team_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.competition_teams t
    WHERE t.id = team_id AND t.captain_user_id = auth.uid()
  )
);

-- Allow team captain to update / remove their team's registrations
CREATE POLICY "captain_update_team_members"
ON public.athlete_registrations
FOR UPDATE
TO authenticated
USING (
  team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.competition_teams t
    WHERE t.id = team_id AND t.captain_user_id = auth.uid()
  )
);

CREATE POLICY "captain_delete_team_members"
ON public.athlete_registrations
FOR DELETE
TO authenticated
USING (
  team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.competition_teams t
    WHERE t.id = team_id AND t.captain_user_id = auth.uid()
  )
);