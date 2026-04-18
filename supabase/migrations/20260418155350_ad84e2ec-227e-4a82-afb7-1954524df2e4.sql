-- Feature flags table
CREATE TABLE public.feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'super_users', 'organizers', 'beta')),
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read flags (the app needs them to render)
CREATE POLICY "Authenticated users can view feature flags"
ON public.feature_flags FOR SELECT
TO authenticated
USING (true);

-- Also allow anonymous reads so guest pages (browse, public competition) can resolve flags
CREATE POLICY "Anonymous users can view feature flags"
ON public.feature_flags FOR SELECT
TO anon
USING (true);

-- Only super users can modify flags
CREATE POLICY "Super users can insert feature flags"
ON public.feature_flags FOR INSERT
TO authenticated
WITH CHECK (public.is_super_user(auth.uid()));

CREATE POLICY "Super users can update feature flags"
ON public.feature_flags FOR UPDATE
TO authenticated
USING (public.is_super_user(auth.uid()))
WITH CHECK (public.is_super_user(auth.uid()));

CREATE POLICY "Super users can delete feature flags"
ON public.feature_flags FOR DELETE
TO authenticated
USING (public.is_super_user(auth.uid()));

-- Auto-update updated_at
CREATE TRIGGER feature_flags_set_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial flags (enabled=NULL means "use code/env default")
INSERT INTO public.feature_flags (key, enabled, audience, description) VALUES
  ('members_management', false, 'all', 'Members management page (/members)'),
  ('affiliation_network', false, 'all', 'Gym affiliation network (/affiliation)'),
  ('gym_website_builder', false, 'all', 'Public gym website builder (/gym-website)'),
  ('performances_analytics', false, 'all', 'Athlete performance analytics (/performances)'),
  ('browse_marketplace', true, 'all', 'Browse competitions marketplace (/browse)'),
  ('seasons', false, 'all', 'Multi-competition season leaderboards'),
  ('brackets', false, 'all', 'Tournament bracket system'),
  ('whiteboard_mode', true, 'all', 'Full-screen leaderboard whiteboard mode'),
  ('competition_templates', true, 'all', 'Save and reuse competition templates'),
  ('share_qr_code', true, 'all', 'QR code sharing for competitions'),
  ('share_social_buttons', false, 'all', 'X/Facebook/LinkedIn share buttons');
