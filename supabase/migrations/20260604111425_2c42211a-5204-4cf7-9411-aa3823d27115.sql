
-- 1) Restrict competition_scores SELECT — remove broad "any non-draft competition" read
DROP POLICY IF EXISTS scores_select ON public.competition_scores;
CREATE POLICY scores_select ON public.competition_scores
FOR SELECT
USING (
  is_super_user(auth.uid())
  OR is_competition_owner(auth.uid(), competition_id)
  OR is_competition_judge(auth.uid(), competition_id)
  OR is_competition_registrant(auth.uid(), competition_id)
  OR EXISTS (
    SELECT 1 FROM public.competition_teams t
    WHERE t.competition_id = competition_scores.competition_id
      AND t.captain_user_id = auth.uid()
  )
);

-- 2) Make public_profiles view use the invoker's permissions (not definer's)
ALTER VIEW public.public_profiles SET (security_invoker = true);
