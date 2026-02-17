
-- ============================================================
-- MIGRATION 2: Provider-Agnostic Billing Schema (clean run)
-- ============================================================

-- ========== STAGE 1: Rename stripe_customers → billing_customers ==========

ALTER TABLE public.stripe_customers RENAME TO billing_customers;

ALTER TABLE public.billing_customers
  ADD COLUMN billing_provider text NULL,
  ADD COLUMN provider_customer_id text NULL;

UPDATE public.billing_customers
SET billing_provider = 'stripe',
    provider_customer_id = stripe_customer_id
WHERE billing_provider IS NULL;

ALTER TABLE public.billing_customers
  ALTER COLUMN billing_provider SET NOT NULL,
  ALTER COLUMN provider_customer_id SET NOT NULL;

ALTER TABLE public.billing_customers
  ADD CONSTRAINT billing_customers_billing_provider_fkey
  FOREIGN KEY (billing_provider) REFERENCES public.billing_providers(key);

ALTER TABLE public.billing_customers
  ADD CONSTRAINT billing_customers_user_provider_unique
  UNIQUE (user_id, billing_provider);

DROP POLICY IF EXISTS "Users can view their own stripe customer" ON public.billing_customers;

CREATE POLICY "Users can view their own billing customer"
  ON public.billing_customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role only insert billing_customers"
  ON public.billing_customers FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Service role only update billing_customers"
  ON public.billing_customers FOR UPDATE
  USING (false);

CREATE POLICY "Service role only delete billing_customers"
  ON public.billing_customers FOR DELETE
  USING (false);

-- ========== STAGE 2: user_subscriptions ==========

ALTER TABLE public.user_subscriptions
  ADD COLUMN billing_provider text NULL,
  ADD COLUMN provider_subscription_id text NULL;

UPDATE public.user_subscriptions
SET billing_provider = 'stripe',
    provider_subscription_id = stripe_subscription_id
WHERE billing_provider IS NULL;

ALTER TABLE public.user_subscriptions
  ALTER COLUMN billing_provider SET NOT NULL,
  ALTER COLUMN provider_subscription_id SET NOT NULL;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_billing_provider_fkey
  FOREIGN KEY (billing_provider) REFERENCES public.billing_providers(key);

-- idx_one_active_sub_per_user already exists, skip

-- ========== STAGE 3: subscription_events ==========

ALTER TABLE public.subscription_events
  ADD COLUMN billing_provider text NULL;

UPDATE public.subscription_events
SET billing_provider = 'stripe'
WHERE billing_provider IS NULL;

ALTER TABLE public.subscription_events
  RENAME COLUMN stripe_event_id TO provider_event_id;

-- Drop old unique CONSTRAINT (not index)
ALTER TABLE public.subscription_events
  DROP CONSTRAINT subscription_events_stripe_event_id_key;

ALTER TABLE public.subscription_events
  ALTER COLUMN billing_provider SET NOT NULL;

ALTER TABLE public.subscription_events
  ADD CONSTRAINT subscription_events_provider_event_unique
  UNIQUE (billing_provider, provider_event_id);

ALTER TABLE public.subscription_events
  ADD CONSTRAINT subscription_events_billing_provider_fkey
  FOREIGN KEY (billing_provider) REFERENCES public.billing_providers(key);

-- ========== STAGE 4: RLS for subscription_events ==========

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only select subscription_events"
  ON public.subscription_events FOR SELECT USING (false);

CREATE POLICY "Service role only insert subscription_events"
  ON public.subscription_events FOR INSERT WITH CHECK (false);

CREATE POLICY "Service role only update subscription_events"
  ON public.subscription_events FOR UPDATE USING (false);

CREATE POLICY "Service role only delete subscription_events"
  ON public.subscription_events FOR DELETE USING (false);
