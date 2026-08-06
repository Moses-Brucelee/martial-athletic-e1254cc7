ALTER TABLE public.competition_workouts ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE public.competition_settings ADD COLUMN IF NOT EXISTS scoring_model text NOT NULL DEFAULT 'points';

ALTER TABLE public.heat_assignments ADD COLUMN IF NOT EXISTS athlete_registration_id uuid REFERENCES public.athlete_registrations(id) ON DELETE CASCADE;
ALTER TABLE public.heat_assignments ALTER COLUMN team_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamp with time zone,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id, read_at, created_at DESC);

CREATE TRIGGER notifications_set_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();