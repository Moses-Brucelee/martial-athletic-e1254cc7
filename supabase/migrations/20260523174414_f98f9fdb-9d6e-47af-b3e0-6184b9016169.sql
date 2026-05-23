
-- 1. Remove overly broad score visibility policy
DROP POLICY IF EXISTS scores_select_published ON public.competition_scores;

-- 2. Make has_competition_access a real check (authenticated user matches arg)
CREATE OR REPLACE FUNCTION public.has_competition_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL AND auth.uid() = p_user_id;
$$;

-- 3. Tighten realtime.messages subscription policy
DROP POLICY IF EXISTS "Authenticated can receive broadcasts" ON realtime.messages;

CREATE POLICY "Authenticated topic scoped"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.competitions c
    WHERE c.id::text = substring(
      realtime.topic()
      FROM '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
    )
    AND (
      c.status <> 'draft'
      OR c.created_by = auth.uid()
      OR public.is_competition_judge(auth.uid(), c.id)
      OR public.is_super_user(auth.uid())
    )
  )
);

-- 4. Revoke public execute on sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.admin_get_user_emails(uuid[]) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_workout_rankings(uuid, uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_competition_leaderboard(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.limit_super_users() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_score_event() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_tier_change() FROM public, anon, authenticated;
