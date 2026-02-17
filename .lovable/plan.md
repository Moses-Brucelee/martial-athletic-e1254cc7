

# Hardened Stripe Edge Function Architecture (Final)

## Pre-requisite: Step 1 Migration Still Pending

The database confirms that `subscription_events`, `user_subscriptions`, `stripe_customers`, `features`, and `tier_features` tables do **not exist yet**. The `pricing_tiers` table is also missing the new columns (`price_monthly_cents`, `stripe_price_id_monthly`, etc.). The Step 1 migration must be applied first.

---

## Hardening Improvements (Added)

### 1. Locked Stripe API Version

Both edge functions will construct the Stripe client with an explicit, fixed `apiVersion` (e.g. `"2024-12-18.acacia"`). This prevents silent behavior changes when Stripe rolls out new API versions.

```text
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});
```

### 2. Extended `subscription_events` Table

The original schema had only: `id`, `stripe_event_id`, `event_type`, `payload`, `processed_at`.

New schema:

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Row ID |
| `stripe_event_id` | text UNIQUE NOT NULL | Idempotency key |
| `event_type` | text NOT NULL | e.g. `checkout.session.completed` |
| `payload` | jsonb NOT NULL | Full Stripe event payload |
| `stripe_api_version` | text | API version from event |
| `created_at` | timestamptz DEFAULT now() | When row was inserted |
| `processed_at` | timestamptz | Set after successful processing |
| `processing_error` | text | Error message if processing failed |

Flow:
- On INSERT (idempotency): `created_at` is set, `processed_at` and `processing_error` are NULL
- On success: `UPDATE SET processed_at = now() WHERE id = inserted_id`
- On failure: `UPDATE SET processing_error = error_message WHERE id = inserted_id`, then return 500

### 3. Fresh Stripe API Fetch for All Subscription Events

For `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`:
- Extract `subscription_id` from the event payload
- Call `stripe.subscriptions.retrieve(subscription_id)` to get the live object
- Use the fresh object for all DB updates (status, period dates, price, cancel_at_period_end)

This ensures we never write stale data from cached/delayed webhook payloads.

### 4. Structured Logging

All critical sync failures will use a consistent log format:

```text
console.error("CRITICAL_STRIPE_SYNC_ERROR", {
  event_id: event.id,
  event_type: event.type,
  error: error.message,
  context: "description of what failed"
});
```

This enables filtering and alerting in log aggregation tools.

---

## Complete Architecture (with all hardening)

### Secrets Required

| Secret | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe API calls |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `APP_URL` | Frontend redirect URLs |

---

### Edge Function 1: `create-checkout-session`

**Config:**
```text
[functions.create-checkout-session]
verify_jwt = true
```

**Request:** POST with `{ "tier_id": "uuid", "billing_interval": "monthly" | "yearly" }`

**Response:** `{ "checkout_url": "..." }` or error with appropriate status code

**Flow:**
1. CORS preflight (OPTIONS returns 200)
2. Create Supabase client from Authorization header, call `auth.getUser()` for user_id and email
3. Validate request body
4. Create service-role Supabase client for DB operations
5. Fetch `pricing_tiers` WHERE `id = tier_id AND is_active = true` -- if not found, return 404
6. Resolve `stripe_price_id_monthly` or `stripe_price_id_yearly` based on `billing_interval` -- if null, return 400
7. Lookup `stripe_customers` by `user_id`
   - If found: reuse `stripe_customer_id`
   - If not: create via `stripe.customers.create()`, insert into `stripe_customers`
8. Create Stripe Checkout Session (mode: subscription, locked API version)
   - `metadata: { user_id, tier_id, billing_interval }`
   - `subscription_data.metadata: { user_id, tier_id }`
   - `success_url: APP_URL/upgrade?status=success`
   - `cancel_url: APP_URL/upgrade?status=cancel`
9. Return `{ checkout_url: session.url }`

---

### Edge Function 2: `stripe-webhook`

**Config:**
```text
[functions.stripe-webhook]
verify_jwt = false
```

**Step-by-step flow:**

```text
1. CORS preflight (OPTIONS -> 200)

2. Read raw body as text

3. Verify Stripe signature (locked API version)
   - Invalid -> return 400

4. Atomic idempotency:
   INSERT INTO subscription_events
     (stripe_event_id, event_type, payload, stripe_api_version)
   VALUES ($1, $2, $3, event.api_version)
   ON CONFLICT (stripe_event_id) DO NOTHING
   RETURNING id

   If no row returned -> already processed -> return 200

5. Try processing the event (wrapped in try/catch):

   Route by event.type:

   checkout.session.completed:
     a. Extract stripe_customer_id, stripe_subscription_id from session
     b. Lookup user_id from stripe_customers
        - Not found -> CRITICAL_STRIPE_SYNC_ERROR log, throw
     c. Fetch fresh subscription: stripe.subscriptions.retrieve()
     d. Match price to pricing_tiers
     e. Cancel other active/trialing subs for this user
     f. UPSERT user_subscriptions (ON CONFLICT stripe_subscription_id)
     g. Update profiles.subscription_tier

   customer.subscription.created:
     a. Extract subscription_id from event
     b. Fetch fresh: stripe.subscriptions.retrieve()
     c. Lookup user_id from stripe_customers via subscription.customer
        - Not found -> CRITICAL_STRIPE_SYNC_ERROR log, throw
     d. Match price to pricing_tiers
     e. Cancel other active/trialing subs for this user
     f. UPSERT user_subscriptions
     g. Update profiles.subscription_tier

   invoice.paid:
     a. Extract subscription_id from invoice
     b. Fetch fresh: stripe.subscriptions.retrieve()
     c. UPDATE user_subscriptions SET status='active',
        current_period_start/end from fresh object
     d. If no row updated -> CRITICAL_STRIPE_SYNC_ERROR, throw

   invoice.payment_failed:
     a. Extract subscription_id
     b. Fetch fresh: stripe.subscriptions.retrieve()
     c. UPDATE user_subscriptions SET status='past_due'
     d. If no row updated -> CRITICAL_STRIPE_SYNC_ERROR, throw

   customer.subscription.updated:
     a. Extract subscription_id
     b. Fetch fresh: stripe.subscriptions.retrieve()
     c. UPDATE user_subscriptions with fresh status, cancel_at_period_end,
        period dates, billing_interval
     d. Update profiles.subscription_tier if tier changed
     e. If no row updated -> CRITICAL_STRIPE_SYNC_ERROR, throw

   customer.subscription.deleted:
     a. Extract subscription_id
     b. Fetch fresh: stripe.subscriptions.retrieve()
     c. UPDATE user_subscriptions SET status='canceled'
     d. Downgrade safety check:
        - Count remaining active/trialing subs for user
        - If 0 -> set profiles.subscription_tier = 'free'
        - If >0 -> set to remaining active tier's key
     e. If no sub row found -> CRITICAL_STRIPE_SYNC_ERROR, throw

   Unrecognized event type -> ignore, fall through to success

6. On SUCCESS:
   UPDATE subscription_events SET processed_at = now()
   WHERE id = inserted_id
   Return 200

7. On FAILURE (catch block):
   console.error("CRITICAL_STRIPE_SYNC_ERROR", { event_id, event_type, error })
   UPDATE subscription_events SET processing_error = error.message
   WHERE id = inserted_id
   Return 500 (Stripe will retry)
```

**Response code rules:**

| Scenario | HTTP Status |
|---|---|
| Processed successfully | 200 |
| Ignored event type | 200 |
| Duplicate event (idempotent) | 200 |
| Invalid signature | 400 |
| DB write failure | 500 |
| Stripe API fetch failure | 500 |
| Customer not found | 500 |
| Any unexpected error | 500 |

**Stripe status mapping:**

| Stripe | DB |
|---|---|
| active | active |
| trialing | trialing |
| past_due | past_due |
| canceled | canceled |
| incomplete | incomplete |
| unpaid | past_due |

---

## Implementation Order

1. **Apply Step 1 database migration** (new tables + columns + function + seed data, with the extended `subscription_events` schema above)
2. **Request secrets**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_URL`
3. **Implement `create-checkout-session`** edge function
4. **Implement `stripe-webhook`** edge function
5. **Update `/upgrade` page** with real checkout flow
6. **Create `useSubscription` hook** for access control

Each step will be presented for approval before execution.

