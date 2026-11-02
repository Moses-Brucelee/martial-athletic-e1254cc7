DROP POLICY IF EXISTS "View competitions" ON public.competitions;
CREATE POLICY "View competitions" ON public.competitions
FOR SELECT
USING (
  auth.uid() = created_by
  OR public.is_super_user(auth.uid())
  OR public.is_competition_judge(auth.uid(), id)
  OR (auth.uid() IS NOT NULL AND public.is_competition_registrant(auth.uid(), id))
  OR (
    status <> ALL (ARRAY['draft'::text, 'unpublished'::text])
    AND (
      COALESCE(visibility, 'public') <> 'private'
      OR (auth.uid() IS NOT NULL AND public.is_competition_gym_member(auth.uid(), id))
    )
  )
);