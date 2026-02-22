
-- Table: menu_items
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_key TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  label TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  route TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active menu items"
  ON public.menu_items FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Table: tier_feature_access
CREATE TABLE public.tier_feature_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_key TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tier_key, feature_key)
);

ALTER TABLE public.tier_feature_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tier feature access"
  ON public.tier_feature_access FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add a broader pricing_tiers SELECT policy for authenticated users
-- (existing policy only shows is_active=true AND is_public=true,
--  but useSubscription needs all active tiers for hierarchy resolution)
CREATE POLICY "Authenticated users can view all active tiers"
  ON public.pricing_tiers FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Seed menu_items: FREE tier
INSERT INTO public.menu_items (tier_key, feature_key, label, icon_name, route, sort_order) VALUES
  ('free', 'view_profile', 'VIEW PROFILE', 'User', '/profile', 1),
  ('free', 'view_leaderboards', 'VIEW COMPETITION LEADERBOARDS', 'Eye', '/competitions', 2);

-- Seed menu_items: AFFILIATE PRO tier
INSERT INTO public.menu_items (tier_key, feature_key, label, icon_name, route, description, sort_order) VALUES
  ('affiliate_pro', 'manage_members', 'MANAGE MEMBERS', 'Users', '/members', 'Get members linked to your account', 1),
  ('affiliate_pro', 'link_gym_website', 'LINK GYM WEBSITE', 'Link2', '/gym-website', 'Connect your gym''s online presence', 2),
  ('affiliate_pro', 'create_competitions', 'CREATE / MANAGE COMPETITIONS', 'Trophy', '/competitions', 'Build and run competitions', 3),
  ('affiliate_pro', 'manage_affiliation', 'MANAGE AFFILIATION', 'Settings', '/affiliation', 'Control your affiliate settings', 4),
  ('affiliate_pro', 'track_performances', 'TRACK MEMBER PERFORMANCES', 'BarChart3', '/performances', 'Monitor athlete progress', 5);

-- Seed tier_feature_access: FREE
INSERT INTO public.tier_feature_access (tier_key, feature_key) VALUES
  ('free', 'view_profile'),
  ('free', 'view_leaderboards');

-- Seed tier_feature_access: AFFILIATE PRO
INSERT INTO public.tier_feature_access (tier_key, feature_key) VALUES
  ('affiliate_pro', 'view_profile'),
  ('affiliate_pro', 'view_leaderboards'),
  ('affiliate_pro', 'create_competitions'),
  ('affiliate_pro', 'manage_members'),
  ('affiliate_pro', 'link_gym_website'),
  ('affiliate_pro', 'manage_affiliation'),
  ('affiliate_pro', 'track_performances');

-- Seed tier_feature_access: TOURNAMENT PRO (for when it becomes active)
INSERT INTO public.tier_feature_access (tier_key, feature_key) VALUES
  ('tournament_pro', 'view_profile'),
  ('tournament_pro', 'view_leaderboards'),
  ('tournament_pro', 'create_competitions'),
  ('tournament_pro', 'manage_members'),
  ('tournament_pro', 'link_gym_website'),
  ('tournament_pro', 'manage_affiliation'),
  ('tournament_pro', 'track_performances'),
  ('tournament_pro', 'advanced_analytics'),
  ('tournament_pro', 'custom_branding');
