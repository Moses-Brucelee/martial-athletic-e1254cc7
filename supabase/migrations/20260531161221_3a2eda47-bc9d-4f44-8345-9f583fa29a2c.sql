-- Remove sensitive tables from Realtime publication to prevent
-- broadcast of PII/judge-only data that bypasses table-level RLS.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'athlete_registrations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.athlete_registrations';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'competition_scores'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.competition_scores';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'scoring_events'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.scoring_events';
  END IF;
END $$;

-- Restrict raw IP/device columns on competition_audit_events to service_role only.
-- Owners can still read the rest of the event row; sensitive network identifiers
-- are no longer projected to authenticated users.
REVOKE SELECT (ip_address, device_id) ON public.competition_audit_events FROM authenticated;
REVOKE SELECT (ip_address, device_id) ON public.competition_audit_events FROM anon;