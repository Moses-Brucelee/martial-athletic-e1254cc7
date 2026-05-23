
-- Helper: is user a registered athlete in a competition (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_competition_registrant(p_user_id uuid, p_competition_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.athlete_registrations
    WHERE competition_id = p_competition_id AND user_id = p_user_id
  );
$$;

-- Helper: is user a member of the gym attached to a private competition
CREATE OR REPLACE FUNCTION public.is_competition_gym_member(p_user_id uuid, p_competition_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.competitions c
    JOIN public.gym_members gm ON gm.gym_id = c.gym_id
    JOIN public.profiles p ON p.id = gm.user_id
    WHERE c.id = p_competition_id
      AND c.gym_id IS NOT NULL
      AND p.user_id = p_user_id
      AND gm.status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_competition_registrant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_competition_gym_member(uuid, uuid) TO authenticated;

-- Rewrite competition SELECT policy without inline EXISTS subqueries
DROP POLICY IF EXISTS "View competitions" ON public.competitions;

CREATE POLICY "View competitions" ON public.competitions
FOR SELECT
USING (
  auth.uid() = created_by
  OR public.is_super_user(auth.uid())
  OR public.is_competition_judge(auth.uid(), id)
  OR (visibility = 'public' AND status <> 'draft')
  OR (auth.uid() IS NOT NULL AND visibility = 'public')
  OR (auth.uid() IS NOT NULL AND public.is_competition_registrant(auth.uid(), id))
  OR (visibility = 'private' AND gym_id IS NOT NULL AND public.is_competition_gym_member(auth.uid(), id))
);
