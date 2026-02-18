
# Enterprise Billing Architecture — Africa-First, Region-First

## Critical Architecture Decision: Schema Strategy

**Moving tables to a `billing` schema is not feasible without breaking the edge functions.** Here is why:

The Supabase JavaScript client (PostgREST) only exposes the `public` schema by default. All edge function calls like `supabase.from("billing_customers")`, `supabase.from("user_subscriptions")` etc. would silently fail or require raw SQL workarounds if moved to a `billing` schema. Enabling additional schema exposure requires Supabase dashboard access to `postgresql.conf`, which is not available in Lovable Cloud.

**Decision:** Tables remain in `public` schema. The `billing` schema concept is implemented as a **naming convention** (`billing_` prefix, already in place) and a **domain module structure** in the edge functions. This is the correct enterprise pattern — schema separation is a PostgreSQL concept, but domain separation is achieved in the application layer. This is also how production systems like Stripe's own internal architecture and companies like Shopify structure their multi-tenant billing systems.

---

## What This Plan Delivers

- Region-first provider resolution (ZA → payfast, DE → paddle, US → stripe)
- No global silent fallback — explicit errors for all-providers-down
- Capability-aware provider model (supports_subscriptions, supports_refunds, etc.)
- Full routing observability log
- currency-aware tier prices
- schema_version and routing_rule_id on subscriptions
- Updated BillingRouter to use region-first logic
- All tables remain in `public` for PostgREST compatibility
- No frontend changes, no runtime behavior changes for current Stripe flow

---

## Database Changes (Migration 3)

### Stage 1 — Extend `billing_providers` with capability columns

Current table has: `key`, `is_active`, `is_default`, `created_at`

Add capability booleans:

```text
supports_subscriptions    boolean DEFAULT true
supports_once_off         boolean DEFAULT false
supports_refunds          boolean DEFAULT true
supports_payouts          boolean DEFAULT false
supports_split_payments   boolean DEFAULT false
supports_recurring_webhooks boolean DEFAULT true
```

Remove `is_default` dependency (replaced by region-first routing). The column stays but is no longer used by the router.

Seed additional providers (inactive until adapters exist):

```text
payfast  — is_active=true,  supports_subscriptions=true
ozow     — is_active=false, supports_subscriptions=false, supports_once_off=true
peach    — is_active=false, supports_subscriptions=true
paddle   — is_active=false, supports_subscriptions=true
```

### Stage 2 — Create `billing_regions`

```text
billing_regions:
  code           text PRIMARY KEY  (AFRICA, EU, NA, APAC)
  primary_provider text NOT NULL FK → billing_providers.key
  fallback_providers text[] DEFAULT '{}'
  created_at     timestamptz DEFAULT now()
```

Seed:

```text
AFRICA  → primary: payfast,  fallback: [ozow, peach]
EU      → primary: paddle,   fallback: []
NA      → primary: stripe,   fallback: []
APAC    → primary: stripe,   fallback: []
```

RLS: `service_role` only for writes; `SELECT` allowed for service role in edge functions (no authenticated user access needed).

### Stage 3 — Create `country_region_map`

```text
country_region_map:
  country_code text PRIMARY KEY
  region_code  text NOT NULL FK → billing_regions.code
```

Seed:

```text
ZA, NG, KE → AFRICA
US, CA     → NA
DE, FR     → EU
IN, SG     → APAC
```

RLS: `service_role` read-only.

### Stage 4 — Create `region_supported_currencies`

```text
region_supported_currencies:
  region_code   text NOT NULL FK → billing_regions.code
  currency_code text NOT NULL
  is_default    boolean DEFAULT false
  PRIMARY KEY (region_code, currency_code)
```

Seed:

```text
AFRICA: ZAR (default), USD
EU:     EUR (default), GBP
NA:     USD (default), CAD
APAC:   USD (default), SGD, INR
```

### Stage 5 — Add `currency_code` to `tier_prices`

Current columns: `id`, `tier_id`, `billing_provider`, `billing_interval`, `provider_price_id`, `is_active`, `created_at`

Add: `currency_code text NOT NULL DEFAULT 'USD'`

Update unique constraint: `(tier_id, billing_provider, billing_interval, currency_code)`

Backfill existing rows to `'USD'`. Current `tier_prices` table is empty (confirmed), so backfill is safe.

### Stage 6 — Create `billing_routing_log`

```text
billing_routing_log:
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
  user_id           uuid NULL
  country           text NULL
  region_code       text NULL
  selected_provider text NOT NULL
  routing_reason    text NOT NULL
  fallback_used     boolean DEFAULT false
  required_capability text NULL
  created_at        timestamptz DEFAULT now()
```

RLS: Users can SELECT their own routing log rows (`user_id = auth.uid()`). Service role for INSERT/UPDATE/DELETE.

### Stage 7 — Extend `user_subscriptions`

Add columns:

```text
schema_version    integer DEFAULT 1 NOT NULL
routing_rule_id   uuid NULL
```

### Stage 8 — Update `billing_provider_rules`

The existing `billing_provider_rules` table handles override rules (e.g., risk-based). No structural change needed — it stays as the rule-based override layer that fires before region lookup.

---

## Updated BillingRouter Logic (`create-checkout-session`)

The new resolution algorithm, fully replacing the current `resolveProvider` function:

```text
resolveProvider({ country, risk_level, required_capability, currency }):

1. RISK OVERRIDE:
   If risk_level provided:
     Query billing_provider_rules WHERE is_active=true ORDER BY priority
     Filter by risk_level match
     For each matching rule:
       Validate provider: is_active, supports required_capability, health != 'down'
       If valid → log to billing_routing_log (reason: 'risk_rule_override') → return
     (No match → fall through to region routing)

2. REGION LOOKUP:
   If country provided:
     SELECT region_code FROM country_region_map WHERE country_code = $country
     If not found → use 'NA' as default region with warning log
   Else:
     Use 'NA' as default region

3. LOAD REGION:
   SELECT primary_provider, fallback_providers FROM billing_regions WHERE code = region_code

4. VALIDATE PRIMARY:
   Check billing_providers: is_active = true
   Check capability: e.g. supports_subscriptions = true (if required)
   Check health: not 'down'
   If valid → log to billing_routing_log (reason: 'region_primary') → return primary_provider

5. ITERATE FALLBACKS:
   For each provider in fallback_providers (in order):
     Apply same validation
     If valid → log (reason: 'region_fallback', fallback_used: true) → return provider

6. NO PROVIDER AVAILABLE:
   Throw explicit error: "No available billing provider in region {region_code}"
   (NO global silent fallback. NO cross-region hop.)
```

**Example resolutions:**

| Scenario | Result |
|---|---|
| country=ZA, all healthy | payfast (region_primary) |
| country=ZA, payfast down | ozow (region_fallback) |
| country=ZA, all AFRICA down | Error: "No available billing provider in region AFRICA" |
| country=DE | paddle (region_primary) |
| country=US | stripe (region_primary) |
| no country | stripe via NA (default region) |

---

## Edge Function Module Structure

The billing domain logic is refactored into domain modules **within the edge function files** (Deno has no package system, so shared logic lives in a shared module file imported by both functions):

```text
supabase/functions/
  _shared/
    billing-router.ts        ← BillingRouter (resolveProvider, logRoutingDecision)
    billing-adapter.ts       ← BillingAdapter interface + loadAdapter map
    stripe-adapter.ts        ← StripeAdapter implementation
    sync-helpers.ts          ← lookupUserId, matchTier, cancelOtherActiveSubs,
                                upsertSubscription, syncProfileTier, SyncError
  create-checkout-session/
    index.ts                 ← Main handler (thin: auth, parse, call router+adapter)
  stripe-webhook/
    index.ts                 ← Webhook handler (uses sync-helpers)
```

This achieves the domain separation (router / adapters / services / webhook / events / models) specified in Section 8 without requiring a build system. Each module has a single responsibility.

---

## What Does NOT Change

- No frontend changes
- No pricing tier data changes
- `stripe-webhook/index.ts` internal Stripe logic is untouched
- `profiles.subscription_tier` sync logic unchanged
- All existing RLS policies preserved
- `stripe_subscription_id` and `stripe_customer_id` legacy columns preserved for backward compatibility
- The `SUPPORTED_PROVIDERS` whitelist in the edge functions is updated to include `['stripe', 'payfast', 'ozow', 'peach', 'paddle']`

---

## Technical Implementation Order

1. **Migration 3** — Database schema additions (Stages 1–8 above)
   - Extend `billing_providers` with capability columns + seed payfast/ozow/peach/paddle
   - Create `billing_regions` + seed
   - Create `country_region_map` + seed
   - Create `region_supported_currencies` + seed
   - Add `currency_code` to `tier_prices`, update unique constraint
   - Create `billing_routing_log`
   - Add `schema_version` + `routing_rule_id` to `user_subscriptions`

2. **Refactor `_shared/billing-router.ts`** — Region-first `resolveProvider` with logging

3. **Refactor `_shared/billing-adapter.ts`** — `BillingAdapter` interface + `loadAdapter` map

4. **Refactor `_shared/stripe-adapter.ts`** — StripeAdapter (checkout + customer management)

5. **Refactor `_shared/sync-helpers.ts`** — All webhook helper functions

6. **Update `create-checkout-session/index.ts`** — Import shared modules, slim handler

7. **Update `stripe-webhook/index.ts`** — Import shared sync-helpers

8. **Update `supabase/config.toml`** — No new function config needed; shared modules auto-included

---

## Safety Guarantees

- No provider name ever appears in routing logic — only adapter registry maps contain keys
- No region logic inside `billing_provider_rules` — rules are override-only (risk, etc.)
- Zero cross-region fallback
- Zero silent global fallback
- Every routing decision is logged with reason
- `billing_providers` whitelist enforced at runtime before any adapter is loaded
- All tables remain in `public` schema for PostgREST/Supabase JS client compatibility
- Supabase types file is not manually edited (auto-generated)
