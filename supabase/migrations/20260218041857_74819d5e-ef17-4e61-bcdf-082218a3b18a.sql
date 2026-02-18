
-- ============================================================
-- MIGRATION 3 + HARDENING: Enterprise Billing Architecture
-- Africa-First, Region-First
-- ============================================================

-- ─── STAGE 1: Extend billing_providers ─────────────────────

ALTER TABLE public.billing_providers
  ADD COLUMN IF NOT EXISTS supports_subscriptions    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_once_off         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_refunds          boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_payouts          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_split_payments   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_recurring_webhooks boolean NOT NULL DEFAULT true,
  -- Cost & Priority Layer (future cost-based optimization)
  ADD COLUMN IF NOT EXISTS transaction_fee_percent   numeric NULL,
  ADD COLUMN IF NOT EXISTS transaction_fee_fixed     numeric NULL,
  ADD COLUMN IF NOT EXISTS priority_weight           integer NOT NULL DEFAULT 100;

-- Seed stripe capabilities (update existing)
UPDATE public.billing_providers
SET
  supports_subscriptions      = true,
  supports_once_off           = false,
  supports_refunds            = true,
  supports_payouts            = false,
  supports_split_payments     = false,
  supports_recurring_webhooks = true,
  priority_weight             = 100
WHERE key = 'stripe';

-- Seed new providers (inactive until adapters exist)
INSERT INTO public.billing_providers
  (key, is_active, is_default, supports_subscriptions, supports_once_off, supports_refunds, supports_payouts, supports_split_payments, supports_recurring_webhooks, priority_weight)
VALUES
  ('payfast', true,  false, true,  false, true,  false, false, true,  100),
  ('ozow',    false, false, false, true,  false, false, false, false, 90),
  ('peach',   false, false, true,  false, true,  false, false, true,  80),
  ('paddle',  false, false, true,  false, true,  false, false, true,  100)
ON CONFLICT (key) DO UPDATE SET
  supports_subscriptions      = EXCLUDED.supports_subscriptions,
  supports_once_off           = EXCLUDED.supports_once_off,
  supports_refunds            = EXCLUDED.supports_refunds,
  supports_payouts            = EXCLUDED.supports_payouts,
  supports_split_payments     = EXCLUDED.supports_split_payments,
  supports_recurring_webhooks = EXCLUDED.supports_recurring_webhooks,
  priority_weight             = EXCLUDED.priority_weight;

-- ─── STAGE 2: Extend provider_health_status (TTL) ──────────

ALTER TABLE public.provider_health_status
  ADD COLUMN IF NOT EXISTS ttl_seconds integer NOT NULL DEFAULT 60;

-- ─── STAGE 3: Create billing_regions ───────────────────────

CREATE TABLE IF NOT EXISTS public.billing_regions (
  code               text PRIMARY KEY,
  primary_provider   text NOT NULL,
  fallback_providers text[] NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_regions
  ADD CONSTRAINT billing_regions_primary_provider_fkey
  FOREIGN KEY (primary_provider) REFERENCES public.billing_providers(key)
  NOT VALID;

ALTER TABLE public.billing_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only reads billing_regions"
  ON public.billing_regions FOR SELECT
  USING (false);

-- Seed regions
INSERT INTO public.billing_regions (code, primary_provider, fallback_providers) VALUES
  ('AFRICA', 'payfast', ARRAY['ozow', 'peach']),
  ('EU',     'paddle',  ARRAY[]::text[]),
  ('NA',     'stripe',  ARRAY[]::text[]),
  ('APAC',   'stripe',  ARRAY[]::text[])
ON CONFLICT (code) DO UPDATE SET
  primary_provider   = EXCLUDED.primary_provider,
  fallback_providers = EXCLUDED.fallback_providers;

-- ─── STAGE 4: Create country_region_map ────────────────────

CREATE TABLE IF NOT EXISTS public.country_region_map (
  country_code text PRIMARY KEY,
  region_code  text NOT NULL
);

ALTER TABLE public.country_region_map
  ADD CONSTRAINT country_region_map_region_code_fkey
  FOREIGN KEY (region_code) REFERENCES public.billing_regions(code)
  NOT VALID;

ALTER TABLE public.country_region_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only reads country_region_map"
  ON public.country_region_map FOR SELECT
  USING (false);

-- Seed country → region mappings
INSERT INTO public.country_region_map (country_code, region_code) VALUES
  ('ZA', 'AFRICA'), ('NG', 'AFRICA'), ('KE', 'AFRICA'),
  ('GH', 'AFRICA'), ('TZ', 'AFRICA'), ('UG', 'AFRICA'),
  ('US', 'NA'),     ('CA', 'NA'),
  ('DE', 'EU'),     ('FR', 'EU'),     ('GB', 'EU'),
  ('NL', 'EU'),     ('ES', 'EU'),     ('IT', 'EU'),
  ('IN', 'APAC'),   ('SG', 'APAC'),   ('AU', 'APAC'),
  ('JP', 'APAC'),   ('NZ', 'APAC')
ON CONFLICT (country_code) DO UPDATE SET
  region_code = EXCLUDED.region_code;

-- ─── STAGE 5: Create region_supported_currencies ───────────

CREATE TABLE IF NOT EXISTS public.region_supported_currencies (
  region_code   text    NOT NULL,
  currency_code text    NOT NULL,
  is_default    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (region_code, currency_code)
);

ALTER TABLE public.region_supported_currencies
  ADD CONSTRAINT region_supported_currencies_region_code_fkey
  FOREIGN KEY (region_code) REFERENCES public.billing_regions(code)
  NOT VALID;

ALTER TABLE public.region_supported_currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only reads region_supported_currencies"
  ON public.region_supported_currencies FOR SELECT
  USING (false);

-- Seed currencies
INSERT INTO public.region_supported_currencies (region_code, currency_code, is_default) VALUES
  ('AFRICA', 'ZAR', true),  ('AFRICA', 'USD', false),
  ('EU',     'EUR', true),  ('EU',     'GBP', false),
  ('NA',     'USD', true),  ('NA',     'CAD', false),
  ('APAC',   'USD', true),  ('APAC',   'SGD', false), ('APAC', 'INR', false)
ON CONFLICT (region_code, currency_code) DO UPDATE SET
  is_default = EXCLUDED.is_default;

-- ─── STAGE 6: Extend tier_prices with currency_code ────────

ALTER TABLE public.tier_prices
  ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'USD';

-- Drop old unique constraint if exists, add new one
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tier_prices_tier_id_billing_provider_billing_interval_key'
  ) THEN
    ALTER TABLE public.tier_prices
      DROP CONSTRAINT tier_prices_tier_id_billing_provider_billing_interval_key;
  END IF;
END $$;

ALTER TABLE public.tier_prices
  DROP CONSTRAINT IF EXISTS tier_prices_unique_price;

ALTER TABLE public.tier_prices
  ADD CONSTRAINT tier_prices_unique_price
  UNIQUE (tier_id, billing_provider, billing_interval, currency_code);

-- ─── STAGE 7: Create billing_routing_log ───────────────────

CREATE TABLE IF NOT EXISTS public.billing_routing_log (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NULL,
  country             text        NULL,
  region_code         text        NULL,
  selected_provider   text        NOT NULL,
  routing_reason      text        NOT NULL,
  fallback_used       boolean     NOT NULL DEFAULT false,
  required_capability text        NULL,
  idempotency_key     text        NULL UNIQUE,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_routing_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own routing log entries
CREATE POLICY "Users can view their own routing logs"
  ON public.billing_routing_log FOR SELECT
  USING (auth.uid() = user_id);

-- Service role only for writes (enforced by having no other INSERT/UPDATE/DELETE policies)
-- (Restrictive pattern: no public write policies = service role only)

-- Index for fast idempotency lookups
CREATE INDEX IF NOT EXISTS billing_routing_log_idempotency_key_idx
  ON public.billing_routing_log (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Index for user lookups
CREATE INDEX IF NOT EXISTS billing_routing_log_user_id_idx
  ON public.billing_routing_log (user_id)
  WHERE user_id IS NOT NULL;

-- ─── STAGE 8: Extend subscription_events with idempotency ──

ALTER TABLE public.subscription_events
  ADD COLUMN IF NOT EXISTS idempotency_key text NULL;

-- Add unique constraint on idempotency_key if not null
CREATE UNIQUE INDEX IF NOT EXISTS subscription_events_idempotency_key_idx
  ON public.subscription_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ─── STAGE 9: Extend user_subscriptions ────────────────────

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS schema_version    integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS routing_rule_id   uuid    NULL;

-- Enforce one active subscription per user
DROP INDEX IF EXISTS public.user_subscriptions_one_active_per_user;
CREATE UNIQUE INDEX user_subscriptions_one_active_per_user
  ON public.user_subscriptions (user_id)
  WHERE status = 'active';

-- Index for faster subscription lookups by user+status
CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_status_idx
  ON public.user_subscriptions (user_id, status);
