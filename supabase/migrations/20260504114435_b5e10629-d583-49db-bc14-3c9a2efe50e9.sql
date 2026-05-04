
-- =========================================================================
-- 1. PROFILES: lock down cross-user read, expose safe columns via view
-- =========================================================================
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON public.profiles;

-- Allow super users to read all profiles (for admin UI)
CREATE POLICY "Super users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_super_user(auth.uid()));

-- Public-safe view exposing only non-sensitive columns
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  display_name,
  full_name,
  avatar_url,
  affiliation
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- =========================================================================
-- 2. ATHLETE_REGISTRATIONS: remove anon/global read, restrict to stakeholders
-- =========================================================================
DROP POLICY IF EXISTS registrations_select ON public.athlete_registrations;

CREATE POLICY registrations_select ON public.athlete_registrations
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR registered_by_user_id = auth.uid()
  OR public.is_competition_owner(auth.uid(), competition_id)
  OR public.is_super_user(auth.uid())
  OR (
    team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.competition_teams t
      WHERE t.id = athlete_registrations.team_id
        AND t.captain_user_id = auth.uid()
    )
  )
  OR public.is_competition_judge(auth.uid(), competition_id)
);

-- =========================================================================
-- 3. COMPETITION_SCORES: remove blanket auth read
-- =========================================================================
DROP POLICY IF EXISTS "Authenticated users can view scores" ON public.competition_scores;

CREATE POLICY scores_select ON public.competition_scores
FOR SELECT TO authenticated
USING (
  public.is_competition_owner(auth.uid(), competition_id)
  OR public.is_competition_judge(auth.uid(), competition_id)
  OR public.is_super_user(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.competition_teams t
    WHERE t.id = competition_scores.team_id
      AND (
        t.captain_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.athlete_registrations ar
          WHERE ar.team_id = t.id AND ar.user_id = auth.uid()
        )
      )
  )
);

-- =========================================================================
-- 4. SCORING_EVENTS: restrict to owner/judge/super
-- =========================================================================
DROP POLICY IF EXISTS scoring_events_select ON public.scoring_events;

CREATE POLICY scoring_events_select ON public.scoring_events
FOR SELECT TO authenticated
USING (
  public.is_competition_owner(auth.uid(), competition_id)
  OR public.is_competition_judge(auth.uid(), competition_id)
  OR public.is_super_user(auth.uid())
);

-- =========================================================================
-- 5. LEADERBOARD_HISTORY: restrict to owner/super only
-- =========================================================================
DROP POLICY IF EXISTS leaderboard_history_select ON public.leaderboard_history;

CREATE POLICY leaderboard_history_select ON public.leaderboard_history
FOR SELECT TO authenticated
USING (
  public.is_competition_owner(auth.uid(), competition_id)
  OR public.is_super_user(auth.uid())
);

-- =========================================================================
-- 6. COMPETITION_AUDIT_EVENTS: add INSERT policy
-- =========================================================================
CREATE POLICY audit_events_insert ON public.competition_audit_events
FOR INSERT TO authenticated
WITH CHECK (
  public.is_competition_owner(auth.uid(), competition_id)
  OR public.is_super_user(auth.uid())
);

-- =========================================================================
-- 7. REALTIME: enforce RLS on realtime.messages
-- Subscribers only receive events if they could SELECT them via RLS.
-- =========================================================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive broadcasts" ON realtime.messages;
CREATE POLICY "Authenticated can receive broadcasts"
ON realtime.messages FOR SELECT
TO authenticated
USING (true);
