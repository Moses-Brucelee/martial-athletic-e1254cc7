import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

// ─── CORS ──────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Constants ─────────────────────────────────────────────────
const STRIPE_API_VERSION = "2024-12-18.acacia";
const HEALTH_STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const SUPPORTED_PROVIDERS = ["stripe", "paypal", "paddle", "payfast"] as const;

// ─── BillingAdapter Interface ──────────────────────────────────
interface BillingAdapter {
  getOrCreateCustomer(
    supabaseAdmin: ReturnType<typeof createClient>,
    userId: string,
    email: string
  ): Promise<string>;

  createCheckoutSession(params: {
    customerId: string;
    providerPriceId: string;
    userId: string;
    tierId: string;
    billingInterval: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;
}

// ─── StripeAdapter ─────────────────────────────────────────────
class StripeAdapter implements BillingAdapter {
  private stripe: Stripe;

  constructor() {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: STRIPE_API_VERSION,
    });
  }

  async getOrCreateCustomer(
    supabaseAdmin: ReturnType<typeof createClient>,
    userId: string,
    email: string
  ): Promise<string> {
    // Check billing_customers (new table) first
    const { data: existing } = await supabaseAdmin
      .from("billing_customers")
      .select("provider_customer_id")
      .eq("user_id", userId)
      .eq("billing_provider", "stripe")
      .single();

    if (existing) {
      return existing.provider_customer_id;
    }

    // Create Stripe customer
    const customer = await this.stripe.customers.create({
      email,
      metadata: { user_id: userId },
    });

    // Insert into billing_customers
    const { error: insertError } = await supabaseAdmin
      .from("billing_customers")
      .insert({
        user_id: userId,
        billing_provider: "stripe",
        provider_customer_id: customer.id,
        stripe_customer_id: customer.id, // backward compat
      });

    if (insertError) {
      console.error("Failed to insert billing_customers row", insertError);
      throw new Error("Failed to create customer record");
    }

    return customer.id;
  }

  async createCheckoutSession(params: {
    customerId: string;
    providerPriceId: string;
    userId: string;
    tierId: string;
    billingInterval: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: params.customerId,
      line_items: [{ price: params.providerPriceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        user_id: params.userId,
        tier_id: params.tierId,
        billing_interval: params.billingInterval,
      },
      subscription_data: {
        metadata: {
          user_id: params.userId,
          tier_id: params.tierId,
        },
      },
    });

    return { url: session.url! };
  }
}

// ─── Adapter Registry (no if/else chains) ──────────────────────
const adapterFactories: Record<string, () => BillingAdapter> = {
  stripe: () => new StripeAdapter(),
};

function loadAdapter(provider: string): BillingAdapter {
  const factory = adapterFactories[provider];
  if (!factory) {
    throw new Error(`No adapter registered for provider: ${provider}`);
  }
  return factory();
}

// ─── BillingRouter ─────────────────────────────────────────────
interface RouterInput {
  country?: string;
  currency?: string;
  risk_level?: string;
}

async function resolveProvider(
  supabaseAdmin: ReturnType<typeof createClient>,
  input: RouterInput
): Promise<string> {
  // 1. Fetch active rules ordered by priority
  const { data: rules, error: rulesError } = await supabaseAdmin
    .from("billing_provider_rules")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (rulesError) {
    console.error("BillingRouter: failed to fetch rules", rulesError);
  }

  // 2. Fetch health statuses
  const { data: healthRows } = await supabaseAdmin
    .from("provider_health_status")
    .select("*");

  const healthMap = new Map(
    (healthRows ?? []).map((h: any) => [h.billing_provider, h])
  );

  let firstDegraded: string | null = null;

  // 3. Evaluate rules
  for (const rule of rules ?? []) {
    const provider = rule.billing_provider;

    // Validate provider is supported
    if (!SUPPORTED_PROVIDERS.includes(provider as any)) continue;

    // Country filter
    if (
      rule.country_codes &&
      input.country &&
      !rule.country_codes.includes(input.country)
    )
      continue;

    // Currency filter
    if (
      rule.currency_codes &&
      input.currency &&
      !rule.currency_codes.includes(input.currency)
    )
      continue;

    // Risk filter
    if (rule.risk_level && rule.risk_level !== input.risk_level) continue;

    // Health check
    const health = healthMap.get(provider);
    let effectiveStatus = "healthy";

    if (health) {
      const lastChecked = new Date(health.last_checked_at).getTime();
      const staleThreshold = Date.now() - HEALTH_STALE_THRESHOLD_MS;

      if (lastChecked < staleThreshold) {
        console.warn("PROVIDER_HEALTH_STALE", {
          provider,
          last_checked_at: health.last_checked_at,
        });
        effectiveStatus = "degraded";
      } else {
        effectiveStatus = health.status;
      }
    }

    if (effectiveStatus === "down") continue;

    if (effectiveStatus === "healthy") {
      console.log("BillingRouter: resolved provider via rule", {
        provider,
        rule_id: rule.id,
      });
      return provider;
    }

    // Track first degraded match
    if (!firstDegraded) {
      firstDegraded = provider;
    }
  }

  // 4. Return degraded provider if no healthy found
  if (firstDegraded) {
    console.warn("BillingRouter: using degraded provider", {
      provider: firstDegraded,
    });
    return firstDegraded;
  }

  // 5. Fallback to default provider
  const { data: defaultProvider } = await supabaseAdmin
    .from("billing_providers")
    .select("key")
    .eq("is_default", true)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!defaultProvider) {
    throw new Error("No billing provider available");
  }

  console.log("BillingRouter: using default provider", {
    provider: defaultProvider.key,
  });
  return defaultProvider.key;
}

// ─── Runtime Provider Validation ───────────────────────────────
async function validateProvider(
  supabaseAdmin: ReturnType<typeof createClient>,
  provider: string
): Promise<void> {
  if (!SUPPORTED_PROVIDERS.includes(provider as any)) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const { data } = await supabaseAdmin
    .from("billing_providers")
    .select("key")
    .eq("key", provider)
    .eq("is_active", true)
    .single();

  if (!data) {
    throw new Error(`Provider not active: ${provider}`);
  }
}

// ─── Main Handler ──────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Auth: validate JWT and get user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const userEmail = user.email ?? "";

    // 2. Parse and validate body
    const body = await req.json();
    const { tier_id, billing_interval } = body;

    if (!tier_id || typeof tier_id !== "string") {
      return new Response(JSON.stringify({ error: "tier_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["monthly", "yearly"].includes(billing_interval)) {
      return new Response(
        JSON.stringify({ error: 'billing_interval must be "monthly" or "yearly"' }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Service-role client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Verify pricing tier exists
    const { data: tier, error: tierError } = await supabaseAdmin
      .from("pricing_tiers")
      .select("id, key")
      .eq("id", tier_id)
      .eq("is_active", true)
      .single();

    if (tierError || !tier) {
      return new Response(
        JSON.stringify({ error: "Pricing tier not found or inactive" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Resolve provider via BillingRouter
    const provider = await resolveProvider(supabaseAdmin, {
      // country/currency/risk_level can be passed from frontend in future
      country: body.country,
      currency: body.currency,
      risk_level: body.risk_level,
    });

    // 6. Validate resolved provider
    await validateProvider(supabaseAdmin, provider);

    // 7. Look up provider_price_id from tier_prices
    const { data: tierPrice } = await supabaseAdmin
      .from("tier_prices")
      .select("provider_price_id")
      .eq("tier_id", tier_id)
      .eq("billing_provider", provider)
      .eq("billing_interval", billing_interval)
      .eq("is_active", true)
      .single();

    if (!tierPrice) {
      return new Response(
        JSON.stringify({
          error: `No price configured for ${billing_interval} billing with provider ${provider}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 8. Load adapter (map-based, no if/else)
    const adapter = loadAdapter(provider);

    // 9. Get or create customer
    const customerId = await adapter.getOrCreateCustomer(
      supabaseAdmin,
      userId,
      userEmail
    );

    // 10. Create checkout session
    const session = await adapter.createCheckoutSession({
      customerId,
      providerPriceId: tierPrice.provider_price_id,
      userId,
      tierId: tier_id,
      billingInterval: billing_interval,
      successUrl: `${appUrl}/upgrade?status=success`,
      cancelUrl: `${appUrl}/upgrade?status=cancel`,
    });

    // 11. Return checkout URL
    return new Response(JSON.stringify({ checkout_url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-checkout-session error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
