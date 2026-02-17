
-- 1. billing_providers
CREATE TABLE public.billing_providers (
  key text PRIMARY KEY,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enforce only one active default provider
CREATE UNIQUE INDEX idx_one_default_provider
  ON public.billing_providers (is_default)
  WHERE is_default = true AND is_active = true;

ALTER TABLE public.billing_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active providers"
  ON public.billing_providers FOR SELECT
  USING (is_active = true);

-- 2. billing_provider_rules
CREATE TABLE public.billing_provider_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority integer NOT NULL,
  country_codes text[],
  currency_codes text[],
  risk_level text,
  billing_provider text NOT NULL REFERENCES public.billing_providers(key),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_provider_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for provider rules"
  ON public.billing_provider_rules FOR SELECT
  USING (false);

-- 3. provider_health_status
CREATE TABLE public.provider_health_status (
  billing_provider text PRIMARY KEY REFERENCES public.billing_providers(key),
  status text NOT NULL DEFAULT 'healthy',
  last_checked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_health_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for health status"
  ON public.provider_health_status FOR SELECT
  USING (false);

-- 4. tier_prices
CREATE TABLE public.tier_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid NOT NULL REFERENCES public.pricing_tiers(id),
  billing_provider text NOT NULL REFERENCES public.billing_providers(key),
  billing_interval text NOT NULL,
  provider_price_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier_id, billing_provider, billing_interval)
);

ALTER TABLE public.tier_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tier prices"
  ON public.tier_prices FOR SELECT
  USING (is_active = true);

-- Seed default provider
INSERT INTO public.billing_providers (key, is_active, is_default)
VALUES ('stripe', true, true);

-- Seed health status
INSERT INTO public.provider_health_status (billing_provider, status)
VALUES ('stripe', 'healthy');

-- Seed catch-all rule
INSERT INTO public.billing_provider_rules (priority, billing_provider, is_active)
VALUES (100, 'stripe', true);

-- Migrate existing stripe price IDs into tier_prices
INSERT INTO public.tier_prices (tier_id, billing_provider, billing_interval, provider_price_id, is_active)
SELECT id, 'stripe', 'monthly', stripe_price_id_monthly, true
FROM public.pricing_tiers
WHERE stripe_price_id_monthly IS NOT NULL;

INSERT INTO public.tier_prices (tier_id, billing_provider, billing_interval, provider_price_id, is_active)
SELECT id, 'stripe', 'yearly', stripe_price_id_yearly, true
FROM public.pricing_tiers
WHERE stripe_price_id_yearly IS NOT NULL;
