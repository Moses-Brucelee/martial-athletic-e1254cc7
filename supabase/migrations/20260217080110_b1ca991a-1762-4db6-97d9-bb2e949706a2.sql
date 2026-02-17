
-- Create pricing_tiers table
CREATE TABLE public.pricing_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price TEXT NOT NULL DEFAULT '$0',
  period TEXT NOT NULL DEFAULT 'forever',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active public tiers"
  ON public.pricing_tiers FOR SELECT
  USING (is_active = true AND is_public = true);

-- Create pricing_features table
CREATE TABLE public.pricing_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_id UUID NOT NULL REFERENCES public.pricing_tiers(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  included BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view features of active tiers"
  ON public.pricing_features FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.pricing_tiers
    WHERE pricing_tiers.id = pricing_features.tier_id
      AND pricing_tiers.is_active = true
      AND pricing_tiers.is_public = true
  ));

-- Seed the existing tiers
INSERT INTO public.pricing_tiers (key, name, price, period, is_popular, sort_order) VALUES
  ('free', 'FREE', '$0', 'forever', false, 1),
  ('affiliate_pro', 'AFFILIATE PRO', '$19', '/month', false, 2),
  ('tournament_pro', 'TOURNAMENT PRO', '$49', '/month', true, 3);

-- Seed features
INSERT INTO public.pricing_features (tier_id, label, included, sort_order)
SELECT t.id, f.label, f.included, f.sort_order
FROM public.pricing_tiers t
CROSS JOIN (VALUES
  ('free', '1 competition', true, 1),
  ('free', 'Basic dashboard', true, 2),
  ('free', 'Community access', true, 3),
  ('free', 'Unlimited competitions', false, 4),
  ('free', 'Team management', false, 5),
  ('free', 'Advanced analytics', false, 6),
  ('free', 'Custom branding', false, 7),
  ('affiliate_pro', '1 competition', true, 1),
  ('affiliate_pro', 'Basic dashboard', true, 2),
  ('affiliate_pro', 'Community access', true, 3),
  ('affiliate_pro', 'Unlimited competitions', true, 4),
  ('affiliate_pro', 'Team management', true, 5),
  ('affiliate_pro', 'Priority support', true, 6),
  ('affiliate_pro', 'Custom branding', false, 7),
  ('tournament_pro', '1 competition', true, 1),
  ('tournament_pro', 'Basic dashboard', true, 2),
  ('tournament_pro', 'Community access', true, 3),
  ('tournament_pro', 'Unlimited competitions', true, 4),
  ('tournament_pro', 'Team management', true, 5),
  ('tournament_pro', 'Advanced analytics', true, 6),
  ('tournament_pro', 'Custom branding', true, 7)
) AS f(tier_key, label, included, sort_order)
WHERE t.key = f.tier_key;

-- Add updated_at trigger for pricing_tiers
CREATE TRIGGER update_pricing_tiers_updated_at
  BEFORE UPDATE ON public.pricing_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
