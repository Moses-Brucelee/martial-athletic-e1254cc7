CREATE POLICY "scores_select_published"
ON public.competition_scores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.competitions c
    WHERE c.id = competition_scores.competition_id
      AND c.status <> 'draft'
  )
);