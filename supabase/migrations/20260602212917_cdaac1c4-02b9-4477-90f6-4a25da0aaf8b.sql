-- Broaden score visibility so all registered athletes/captains can see
-- the full leaderboard (not only their own team's scores).
DROP POLICY IF EXISTS scores_select ON public.competition_scores;

CREATE POLICY scores_select ON public.competition_scores
FOR SELECT
USING (
  is_super_user(auth.uid())
  OR is_competition_owner(auth.uid(), competition_id)
  OR is_competition_judge(auth.uid(), competition_id)
  -- Any registered athlete in the competition can view all scores
  OR is_competition_registrant(auth.uid(), competition_id)
  -- Or a team captain in this competition
  OR EXISTS (
    SELECT 1 FROM public.competition_teams t
    WHERE t.competition_id = competition_scores.competition_id
      AND t.captain_user_id = auth.uid()
  )
  -- Or anyone who can otherwise see the competition (published/live/completed)
  OR EXISTS (
    SELECT 1 FROM public.competitions c
    WHERE c.id = competition_scores.competition_id
      AND c.status <> 'draft'
  )
);