
-- =============================================================
-- Step 1: Stripe subscription infrastructure migration
-- =============================================================

-- 1. Add Stripe-related columns to pricing_tiers
ALTER TABLE public.pricing_tiers
  ADD COLUMN IF NOT EXISTS price_monthly_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_yearly_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_price_id_monthly text,
  ADD COLUMN IF NOT EXISTS stripe_price_id_yearly text;

-- 2. Create stripe_customers table
CREATE TABLE public.stripe_customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

-- Service role only (edge functions). Users can read their own row.
CREATE POLICY "Users can view their own stripe customer"
  ON public.stripe_customers FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for anon/authenticated — only service role writes.

-- 3. Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tier_id uuid NOT NULL REFERENCES public.pricing_tiers(id),
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  status text NOT NULL DEFAULT 'incomplete',
  billing_interval text NOT NULL DEFAULT 'monthly',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Partial unique index: only one active/trialing sub per user
CREATE UNIQUE INDEX idx_one_active_sub_per_user
  ON public.user_subscriptions (user_id)
  WHERE status IN ('active', 'trialing');

-- Trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create subscription_events table (extended/hardened schema)
CREATE TABLE public.subscription_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  stripe_api_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_error text
);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- No public access — only service role writes/reads from edge functions.
