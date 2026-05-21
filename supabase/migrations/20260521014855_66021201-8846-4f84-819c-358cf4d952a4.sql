
-- 1. Pin search_path on pgmq helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

-- 2. Revoke broad EXECUTE on SECURITY DEFINER functions, then grant narrowly.
-- Internal / privileged helpers: only authenticated callers (RLS / function body still enforces super-user where required)
REVOKE EXECUTE ON FUNCTION public.admin_get_user_emails(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recompute_workout_rankings(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recompute_competition_leaderboard(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_sponsor_click(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_competition_judge(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_competition_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_user(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_gym_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_gym_member_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_competition_access(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_tier_at_least(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_season_leaderboard(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_get_user_emails(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_workout_rankings(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_competition_leaderboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_sponsor_click(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_competition_judge(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_competition_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gym_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gym_member_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_competition_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_tier_at_least(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_season_leaderboard(uuid) TO authenticated;

-- Public-facing readers (keep anon access for guest browse / public event pages)
GRANT EXECUTE ON FUNCTION public.get_competition_leaderboard(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_competition_status(uuid) TO anon, authenticated;

-- 3. Storage bucket listing hardening
-- Drop any broad SELECT policies that allow listing avatars / competition-posters,
-- then add per-object SELECT (URL fetch still works because objects are publicly readable by path).
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (qual ILIKE '%avatars%' OR qual ILIKE '%competition-posters%' OR policyname ILIKE '%avatar%' OR policyname ILIKE '%poster%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Allow reading individual files by URL (Supabase serves public buckets without listing rights when no broad SELECT policy exists).
-- Restrict LIST to owners / super users only.
CREATE POLICY "avatars_owner_list"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (owner = auth.uid() OR public.is_super_user(auth.uid()))
);

CREATE POLICY "posters_owner_list"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'competition-posters'
  AND (owner = auth.uid() OR public.is_super_user(auth.uid()))
);

-- Re-establish write policies (owner-only) in case they were dropped above
CREATE POLICY "avatars_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "avatars_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "avatars_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND (owner = auth.uid() OR public.is_super_user(auth.uid())));

CREATE POLICY "posters_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'competition-posters' AND owner = auth.uid());

CREATE POLICY "posters_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'competition-posters' AND owner = auth.uid());

CREATE POLICY "posters_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'competition-posters' AND (owner = auth.uid() OR public.is_super_user(auth.uid())));
