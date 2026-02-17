import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STRIPE_API_VERSION = "2024-12-18.acacia";

const STATUS_MAP: Record<string, string> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  canceled: "canceled",
  incomplete: "incomplete",
  unpaid: "past_due",
};

function mapStatus(stripeStatus: string): string {
  return STATUS_MAP[stripeStatus] ?? stripeStatus;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: STRIPE_API_VERSION,
  });

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Read raw body
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Verify Stripe signature
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error("Stripe signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 3. Atomic idempotency: INSERT ON CONFLICT DO NOTHING RETURNING id
  const { data: insertedEvent } = await supabaseAdmin
    .from("subscription_events")
    .insert({
      provider_event_id: event.id,
      billing_provider: "stripe",
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
      stripe_api_version: (event as any).api_version ?? null,
    })
    .select("id")
    .single();

  if (!insertedEvent) {
    // Already processed — idempotent exit
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventRowId = insertedEvent.id;

  // 4. Process event (try/catch for failure tracking)
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        const userId = await lookupUserId(supabaseAdmin, stripeCustomerId);
        const freshSub = await stripe.subscriptions.retrieve(
          stripeSubscriptionId
        );
        const priceId = freshSub.items.data[0]?.price?.id;
        const tier = await matchTier(supabaseAdmin, priceId);

        await cancelOtherActiveSubs(
          supabaseAdmin,
          userId,
          stripeSubscriptionId
        );
        await upsertSubscription(
          supabaseAdmin,
          userId,
          tier,
          freshSub,
          stripeCustomerId
        );
        await syncProfileTier(supabaseAdmin, userId, tier.key);
        break;
      }

      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const stripeSubscriptionId = sub.id;
        const stripeCustomerId = sub.customer as string;

        const userId = await lookupUserId(supabaseAdmin, stripeCustomerId);
        const freshSub = await stripe.subscriptions.retrieve(
          stripeSubscriptionId
        );
        const priceId = freshSub.items.data[0]?.price?.id;
        const tier = await matchTier(supabaseAdmin, priceId);

        await cancelOtherActiveSubs(
          supabaseAdmin,
          userId,
          stripeSubscriptionId
        );
        await upsertSubscription(
          supabaseAdmin,
          userId,
          tier,
          freshSub,
          stripeCustomerId
        );
        await syncProfileTier(supabaseAdmin, userId, tier.key);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break; // one-off invoice, ignore

        const freshSub = await stripe.subscriptions.retrieve(subscriptionId);

        const { count } = await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: "active",
            current_period_start: new Date(
              freshSub.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              freshSub.current_period_end * 1000
            ).toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId)
          .select("id", { count: "exact", head: true });

        if (!count || count === 0) {
          throw new SyncError("No subscription row found for invoice.paid", {
            subscriptionId,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        await stripe.subscriptions.retrieve(subscriptionId); // validate exists

        const { count } = await supabaseAdmin
          .from("user_subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", subscriptionId)
          .select("id", { count: "exact", head: true });

        if (!count || count === 0) {
          throw new SyncError(
            "No subscription row found for invoice.payment_failed",
            { subscriptionId }
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const freshSub = await stripe.subscriptions.retrieve(sub.id);
        const priceId = freshSub.items.data[0]?.price?.id;
        const interval = freshSub.items.data[0]?.price?.recurring?.interval;

        const { count } = await supabaseAdmin
          .from("user_subscriptions")
          .update({
            status: mapStatus(freshSub.status),
            cancel_at_period_end: freshSub.cancel_at_period_end,
            current_period_start: new Date(
              freshSub.current_period_start * 1000
            ).toISOString(),
            current_period_end: new Date(
              freshSub.current_period_end * 1000
            ).toISOString(),
            billing_interval: interval === "year" ? "yearly" : "monthly",
          })
          .eq("stripe_subscription_id", sub.id)
          .select("id", { count: "exact", head: true });

        if (!count || count === 0) {
          throw new SyncError(
            "No subscription row found for subscription.updated",
            { subscriptionId: sub.id }
          );
        }

        // Sync tier if price changed
        if (priceId) {
          try {
            const tier = await matchTier(supabaseAdmin, priceId);
            // Get user_id from the subscription row
            const { data: subRow } = await supabaseAdmin
              .from("user_subscriptions")
              .select("user_id")
              .eq("stripe_subscription_id", sub.id)
              .single();
            if (subRow) {
              await syncProfileTier(supabaseAdmin, subRow.user_id, tier.key);
            }
          } catch {
            // Tier match failed — non-fatal for update events
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await stripe.subscriptions.retrieve(sub.id); // validate

        // Get user_id before updating status
        const { data: subRow } = await supabaseAdmin
          .from("user_subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", sub.id)
          .single();

        if (!subRow) {
          throw new SyncError(
            "No subscription row found for subscription.deleted",
            { subscriptionId: sub.id }
          );
        }

        await supabaseAdmin
          .from("user_subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", sub.id);

        // Downgrade safety: check for remaining active subs
        const { count: activeCount } = await supabaseAdmin
          .from("user_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", subRow.user_id)
          .in("status", ["active", "trialing"]);

        if (!activeCount || activeCount === 0) {
          await syncProfileTier(supabaseAdmin, subRow.user_id, "free");
        } else {
          // Find the remaining active tier
          const { data: activeSub } = await supabaseAdmin
            .from("user_subscriptions")
            .select("tier_id")
            .eq("user_id", subRow.user_id)
            .in("status", ["active", "trialing"])
            .limit(1)
            .single();

          if (activeSub) {
            const { data: activeTier } = await supabaseAdmin
              .from("pricing_tiers")
              .select("key")
              .eq("id", activeSub.tier_id)
              .single();

            if (activeTier) {
              await syncProfileTier(
                supabaseAdmin,
                subRow.user_id,
                activeTier.key
              );
            }
          }
        }
        break;
      }

      default:
        // Unrecognized event type — ignore
        break;
    }

    // 5. Success: mark processed
    await supabaseAdmin
      .from("subscription_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", eventRowId);

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // 6. Failure: log and mark error
    console.error("CRITICAL_STRIPE_SYNC_ERROR", {
      event_id: event.id,
      event_type: event.type,
      error: error instanceof Error ? error.message : String(error),
      context:
        error instanceof SyncError ? error.context : "unexpected_exception",
    });

    await supabaseAdmin
      .from("subscription_events")
      .update({
        processing_error:
          error instanceof Error ? error.message : String(error),
      })
      .eq("id", eventRowId);

    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Helper Functions ──────────────────────────────────────────

class SyncError extends Error {
  context: Record<string, unknown>;
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = "SyncError";
    this.context = context;
  }
}

async function lookupUserId(
  supabase: ReturnType<typeof createClient>,
  stripeCustomerId: string
): Promise<string> {
  const { data, error } = await supabase
    .from("billing_customers")
    .select("user_id")
    .eq("provider_customer_id", stripeCustomerId)
    .eq("billing_provider", "stripe")
    .single();

  if (error || !data) {
    throw new SyncError("billing_customer not found in database", {
      stripeCustomerId,
    });
  }
  return data.user_id;
}

async function matchTier(
  supabase: ReturnType<typeof createClient>,
  priceId: string | undefined
): Promise<{ id: string; key: string }> {
  if (!priceId) {
    throw new SyncError("No price ID on subscription item");
  }

  // Use tier_prices as the sole source of provider↔price mapping
  const { data: tierPrice } = await supabase
    .from("tier_prices")
    .select("tier_id")
    .eq("provider_price_id", priceId)
    .eq("billing_provider", "stripe")
    .eq("is_active", true)
    .single();

  if (!tierPrice) {
    throw new SyncError("No tier_prices row matches Stripe price ID", { priceId });
  }

  const { data: tier } = await supabase
    .from("pricing_tiers")
    .select("id, key")
    .eq("id", tierPrice.tier_id)
    .eq("is_active", true)
    .single();

  if (!tier) {
    throw new SyncError("Pricing tier not found for tier_id", { tier_id: tierPrice.tier_id });
  }

  return tier;
}

async function cancelOtherActiveSubs(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  incomingSubId: string
): Promise<void> {
  await supabase
    .from("user_subscriptions")
    .update({ status: "canceled" })
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .neq("stripe_subscription_id", incomingSubId);
}

async function upsertSubscription(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tier: { id: string; key: string },
  freshSub: Stripe.Subscription,
  stripeCustomerId: string
): Promise<void> {
  const interval = freshSub.items.data[0]?.price?.recurring?.interval;

  const { error } = await supabase.from("user_subscriptions").upsert(
    {
      user_id: userId,
      tier_id: tier.id,
      stripe_subscription_id: freshSub.id,
      stripe_customer_id: stripeCustomerId,
      billing_provider: "stripe",
      provider_subscription_id: freshSub.id,
      status: mapStatus(freshSub.status),
      billing_interval: interval === "year" ? "yearly" : "monthly",
      current_period_start: new Date(
        freshSub.current_period_start * 1000
      ).toISOString(),
      current_period_end: new Date(
        freshSub.current_period_end * 1000
      ).toISOString(),
      cancel_at_period_end: freshSub.cancel_at_period_end,
    },
    { onConflict: "stripe_subscription_id" }
  );

  if (error) {
    throw new SyncError("Failed to upsert user_subscriptions", {
      error: error.message,
    });
  }
}

async function syncProfileTier(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tierKey: string
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ subscription_tier: tierKey })
    .eq("user_id", userId);

  if (error) {
    console.error("CRITICAL_STRIPE_SYNC_ERROR", {
      context: "syncProfileTier failed",
      userId,
      tierKey,
      error: error.message,
    });
    // Non-fatal — don't throw, subscription state is already saved
  }
}
