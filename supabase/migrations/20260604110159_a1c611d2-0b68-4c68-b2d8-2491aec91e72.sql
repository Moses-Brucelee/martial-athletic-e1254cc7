-- Allow the public shared /event/:id link to load any non-draft, non-unpublished competition
-- regardless of visibility (public vs private/affiliate). Affiliate restriction is enforced at
-- REGISTRATION time in the app, not at view time — the page itself is a public landing page.

DROP POLICY IF EXISTS "View competitions" ON public.competitions;

CREATE POLICY "View competitions"
ON public.competitions
FOR SELECT
TO public
USING (
  -- Owner / super / judge / registrant always
  (auth.uid() = created_by)
  OR public.is_super_user(auth.uid())
  OR public.is_competition_judge(auth.uid(), id)
  OR ((auth.uid() IS NOT NULL) AND public.is_competition_registrant(auth.uid(), id))
  -- Any non-draft / non-unpublished competition is visible to the public landing page
  OR (status <> ALL (ARRAY['draft'::text, 'unpublished'::text]))
);
