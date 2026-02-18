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

// Runtime whitelist — adapters map must also contain these keys to be routable
const SUPPORTED_PROVIDERS = [
  "stripe",
  "payfast",
  "ozow",
  "peach",
  "paddle",
] as const;
type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

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
    const { data: existing } = await supabaseAdmin
      .from("billing_customers")
      .select("provider_customer_id")
      .eq("user_id", userId)
      .eq("billing_provider", "stripe")
      .single();

    if (existing) {
      return existing.provider_customer_id;
    }

    const customer = await this.stripe.customers.create({
      email,
      metadata: { user_id: userId },
    });

    const { error: insertError } = await supabaseAdmin
      .from("billing_customers")
      .insert({
        user_id: userId,
        billing_provider: "stripe",
        provider_customer_id: customer.id,
        stripe_customer_id: customer.id,
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

// ─── Adapter Registry (map-based, no if/else chains) ───────────
// Only providers listed here can ever be routed to.
// Stripe is ONLY here — it is not a fallback in routing logic.
const adapterFactories: Partial<Record<SupportedProvider, () => BillingAdapter>> = {
  stripe: () => new StripeAdapter(),
  // payfast: () => new PayfastAdapter(),  ← add when adapter is ready
  // ozow: () => new OzowAdapter(),
  // peach: () => new PeachAdapter(),
  // paddle: () => new PaddleAdapter(),
};

function loadAdapter(provider: string): BillingAdapter {
  if (!SUPPORTED_PROVIDERS.includes(provider as SupportedProvider)) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  const factory = adapterFactories[provider as SupportedProvider];
  if (!factory) {
    throw new Error(
      `Provider '${provider}' is registered in the routing table but has no adapter implementation yet`
    );
  }
  return factory();
}

// ─── BillingRouter Types ────────────────────────────────────────
interface RouterInput {
  country?: string;
  currency?: string;
  risk_level?: string;
  required_capability?: string;
  idempotency_key?: string;
}

interface RoutingDecision {
  provider: string;
  reason: string;
  region_code: string | null;
  fallback_used: boolean;
  routing_rule_id: string | null;
  cached: boolean;
}

// ─── Health Validation Helper ───────────────────────────────────
function isProviderHealthy(
  healthMap: Map<string, any>,
  provider: string,
  routingLog: string[]
): boolean {
  const health = healthMap.get(provider);

  if (!health) {
    // No health record: treat as healthy (new provider, not yet monitored)
    return true;
  }

  const lastCheckedMs = new Date(health.last_checked_at).getTime();
  const ttlMs = (health.ttl_seconds ?? 60) * 1000;
  const ageMs = Date.now() - lastCheckedMs;

  if (ageMs > ttlMs) {
    // Health record is stale — treat as unknown, log warning, but allow routing
    routingLog.push(
      `PROVIDER_HEALTH_STALE: provider=${provider} last_checked_at=${health.last_checked_at} ttl_seconds=${health.ttl_seconds ?? 60} age_ms=${ageMs}`
    );
    console.warn("PROVIDER_HEALTH_STALE", {
      provider,
      last_checked_at: health.last_checked_at,
      ttl_seconds: health.ttl_seconds,
      age_ms: ageMs,
    });
    // Stale = unknown, not down. Continue evaluation (not excluded).
    return true;
  }

  if (health.status === "down") {
    return false;
  }

  return true; // 'healthy' or 'degraded' — both allowed
}

// ─── Capability Validation Helper ──────────────────────────────
async function isProviderCapable(
  supabaseAdmin: ReturnType<typeof createClient>,
  provider: string,
  requiredCapability: string | undefined
): Promise<boolean> {
  if (!requiredCapability) return true;

  const { data } = await supabaseAdmin
    .from("billing_providers")
    .select("*")
    .eq("key", provider)
    .eq("is_active", true)
    .single();

  if (!data) return false;

  const capabilityMap: Record<string, boolean> = {
    supports_subscriptions:      data.supports_subscriptions,
    supports_once_off:           data.supports_once_off,
    supports_refunds:            data.supports_refunds,
    supports_payouts:            data.supports_payouts,
    supports_split_payments:     data.supports_split_payments,
    supports_recurring_webhooks: data.supports_recurring_webhooks,
  };

  return capabilityMap[requiredCapability] === true;
}

// ─── Log Routing Decision ───────────────────────────────────────
async function logRoutingDecision(
  supabaseAdmin: ReturnType<typeof createClient>,
  decision: {
    user_id: string | null;
    country: string | null;
    region_code: string | null;
    selected_provider: string;
    routing_reason: string;
    fallback_used: boolean;
    required_capability: string | null;
    idempotency_key: string | null;
  }
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("billing_routing_log")
    .insert(decision)
    .select("id")
    .single();

  if (error) {
    // Non-fatal: log failure should never block checkout
    console.error("Failed to write billing_routing_log", error);
    return null;
  }

  return data?.id ?? null;
}

// ─── BillingRouter: resolveProvider ────────────────────────────
async function resolveProvider(
  supabaseAdmin: ReturnType<typeof createClient>,
  input: RouterInput,
  userId: string
): Promise<RoutingDecision> {
  const routingLog: string[] = [];

  // ── IDEMPOTENCY CHECK ──────────────────────────────────────────
  // If an idempotency_key is provided and a routing log entry already exists,
  // return the cached routing result without re-processing.
  if (input.idempotency_key) {
    const { data: cached } = await supabaseAdmin
      .from("billing_routing_log")
      .select("selected_provider, region_code, routing_reason, fallback_used, id")
      .eq("idempotency_key", input.idempotency_key)
      .single();

    if (cached) {
      console.log("BillingRouter: idempotency cache hit", {
        idempotency_key: input.idempotency_key,
        provider: cached.selected_provider,
      });
      return {
        provider: cached.selected_provider,
        reason: cached.routing_reason,
        region_code: cached.region_code,
        fallback_used: cached.fallback_used,
        routing_rule_id: cached.id,
        cached: true,
      };
    }
  }

  // ── FETCH HEALTH MAP ───────────────────────────────────────────
  const { data: healthRows } = await supabaseAdmin
    .from("provider_health_status")
    .select("billing_provider, status, last_checked_at, ttl_seconds");

  const healthMap = new Map(
    (healthRows ?? []).map((h: any) => [h.billing_provider, h])
  );

  // ── STEP 1: RISK OVERRIDE via billing_provider_rules ──────────
  if (input.risk_level) {
    const { data: rules, error: rulesError } = await supabaseAdmin
      .from("billing_provider_rules")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (rulesError) {
      console.error("BillingRouter: failed to fetch provider rules", rulesError);
    }

    for (const rule of rules ?? []) {
      const provider = rule.billing_provider;

      // Must be in runtime whitelist
      if (!SUPPORTED_PROVIDERS.includes(provider as SupportedProvider)) continue;

      // Must match risk level
      if (rule.risk_level && rule.risk_level !== input.risk_level) continue;

      // Country filter (optional on rule)
      if (
        rule.country_codes?.length &&
        input.country &&
        !rule.country_codes.includes(input.country)
      ) continue;

      // Currency filter (optional on rule)
      if (
        rule.currency_codes?.length &&
        input.currency &&
        !rule.currency_codes.includes(input.currency)
      ) continue;

      // Health check (TTL-aware)
      if (!isProviderHealthy(healthMap, provider, routingLog)) continue;

      // Capability check
      const capable = await isProviderCapable(
        supabaseAdmin,
        provider,
        input.required_capability
      );
      if (!capable) continue;

      // ✓ Valid risk override
      console.log("BillingRouter: risk rule override", {
        provider,
        rule_id: rule.id,
        risk_level: input.risk_level,
      });

      const logId = await logRoutingDecision(supabaseAdmin, {
        user_id: userId,
        country: input.country ?? null,
        region_code: null,
        selected_provider: provider,
        routing_reason: "risk_rule_override",
        fallback_used: false,
        required_capability: input.required_capability ?? null,
        idempotency_key: input.idempotency_key ?? null,
      });

      return {
        provider,
        reason: "risk_rule_override",
        region_code: null,
        fallback_used: false,
        routing_rule_id: logId,
        cached: false,
      };
    }

    // No matching rule → fall through to region routing
    console.log("BillingRouter: no risk rule matched, falling through to region routing");
  }

  // ── STEP 2: STRICT COUNTRY → REGION LOOKUP ────────────────────
  // country is REQUIRED for region routing.
  // If missing → throw. No silent NA default.
  if (!input.country) {
    throw new Error(
      "BillingRouter: country is required for region-first routing. " +
      "Pass country=XX in the checkout request."
    );
  }

  const { data: regionRow, error: regionLookupError } = await supabaseAdmin
    .from("country_region_map")
    .select("region_code")
    .eq("country_code", input.country.toUpperCase())
    .single();

  if (regionLookupError || !regionRow) {
    // STRICT: unsupported country → explicit error. No NA fallback.
    throw new Error(
      `Unsupported billing country: '${input.country}'. ` +
      "This country is not mapped to any billing region."
    );
  }

  const regionCode = regionRow.region_code;

  // ── STEP 3: LOAD REGION ────────────────────────────────────────
  const { data: region, error: regionError } = await supabaseAdmin
    .from("billing_regions")
    .select("primary_provider, fallback_providers")
    .eq("code", regionCode)
    .single();

  if (regionError || !region) {
    throw new Error(`BillingRouter: region '${regionCode}' not found in billing_regions`);
  }

  // ── STEP 4: VALIDATE PRIMARY PROVIDER ─────────────────────────
  const primaryProvider = region.primary_provider;

  const primaryHealthy = isProviderHealthy(healthMap, primaryProvider, routingLog);
  const primaryCapable = await isProviderCapable(
    supabaseAdmin,
    primaryProvider,
    input.required_capability
  );

  // Also verify is_active in billing_providers
  const { data: primaryData } = await supabaseAdmin
    .from("billing_providers")
    .select("is_active")
    .eq("key", primaryProvider)
    .single();

  if (primaryHealthy && primaryCapable && primaryData?.is_active) {
    console.log("BillingRouter: region primary selected", {
      provider: primaryProvider,
      region: regionCode,
      country: input.country,
    });

    // Log any stale health warnings accumulated
    if (routingLog.length > 0) {
      console.warn("BillingRouter: routing warnings", routingLog);
    }

    const logId = await logRoutingDecision(supabaseAdmin, {
      user_id: userId,
      country: input.country,
      region_code: regionCode,
      selected_provider: primaryProvider,
      routing_reason: "region_primary",
      fallback_used: false,
      required_capability: input.required_capability ?? null,
      idempotency_key: input.idempotency_key ?? null,
    });

    return {
      provider: primaryProvider,
      reason: "region_primary",
      region_code: regionCode,
      fallback_used: false,
      routing_rule_id: logId,
      cached: false,
    };
  }

  console.warn("BillingRouter: primary provider unavailable", {
    provider: primaryProvider,
    region: regionCode,
    healthy: primaryHealthy,
    capable: primaryCapable,
    active: primaryData?.is_active,
  });

  // ── STEP 5: ITERATE FALLBACK PROVIDERS ────────────────────────
  const fallbacks: string[] = region.fallback_providers ?? [];

  for (const fallbackProvider of fallbacks) {
    if (!SUPPORTED_PROVIDERS.includes(fallbackProvider as SupportedProvider)) {
      console.warn("BillingRouter: fallback provider not in runtime whitelist", {
        provider: fallbackProvider,
      });
      continue;
    }

    const fbHealthy = isProviderHealthy(healthMap, fallbackProvider, routingLog);
    const fbCapable = await isProviderCapable(
      supabaseAdmin,
      fallbackProvider,
      input.required_capability
    );

    const { data: fbData } = await supabaseAdmin
      .from("billing_providers")
      .select("is_active")
      .eq("key", fallbackProvider)
      .single();

    if (!fbHealthy || !fbCapable || !fbData?.is_active) {
      console.warn("BillingRouter: fallback provider unavailable", {
        provider: fallbackProvider,
        healthy: fbHealthy,
        capable: fbCapable,
        active: fbData?.is_active,
      });
      continue;
    }

    console.log("BillingRouter: region fallback selected", {
      provider: fallbackProvider,
      region: regionCode,
      country: input.country,
    });

    if (routingLog.length > 0) {
      console.warn("BillingRouter: routing warnings", routingLog);
    }

    const logId = await logRoutingDecision(supabaseAdmin, {
      user_id: userId,
      country: input.country,
      region_code: regionCode,
      selected_provider: fallbackProvider,
      routing_reason: "region_fallback",
      fallback_used: true,
      required_capability: input.required_capability ?? null,
      idempotency_key: input.idempotency_key ?? null,
    });

    return {
      provider: fallbackProvider,
      reason: "region_fallback",
      region_code: regionCode,
      fallback_used: true,
      routing_rule_id: logId,
      cached: false,
    };
  }

  // ── STEP 6: NO PROVIDER AVAILABLE — EXPLICIT ERROR ────────────
  // NO global silent fallback. NO cross-region hop.
  if (routingLog.length > 0) {
    console.warn("BillingRouter: routing warnings before failure", routingLog);
  }

  throw new Error(
    `No available billing provider in region ${regionCode}. ` +
    `All providers are down, inactive, or lack required capability.`
  );
}

// ─── Runtime Provider Validation ───────────────────────────────
// Final guard: ensures resolved provider is active in DB and whitelisted.
async function validateProvider(
  supabaseAdmin: ReturnType<typeof createClient>,
  provider: string
): Promise<void> {
  if (!SUPPORTED_PROVIDERS.includes(provider as SupportedProvider)) {
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

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

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
    const {
      tier_id,
      billing_interval,
      country,
      currency,
      risk_level,
      required_capability,
      idempotency_key,
    } = body;

    if (!tier_id || typeof tier_id !== "string") {
      return new Response(JSON.stringify({ error: "tier_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["monthly", "yearly"].includes(billing_interval)) {
      return new Response(
        JSON.stringify({
          error: 'billing_interval must be "monthly" or "yearly"',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!country || typeof country !== "string") {
      return new Response(
        JSON.stringify({
          error: "country is required (ISO 3166-1 alpha-2, e.g. 'ZA')",
        }),
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

    // 5. Resolve provider via BillingRouter (region-first, deterministic)
    const decision = await resolveProvider(
      supabaseAdmin,
      {
        country,
        currency,
        risk_level,
        required_capability: required_capability ?? "supports_subscriptions",
        idempotency_key,
      },
      userId
    );

    const { provider, routing_rule_id } = decision;

    // 6. Final runtime validation of resolved provider
    await validateProvider(supabaseAdmin, provider);

    // 7. Look up provider_price_id from tier_prices
    // currency_code defaults to region default if not provided
    const priceQuery = supabaseAdmin
      .from("tier_prices")
      .select("provider_price_id")
      .eq("tier_id", tier_id)
      .eq("billing_provider", provider)
      .eq("billing_interval", billing_interval)
      .eq("is_active", true);

    // If currency provided, filter by it; otherwise take first active price
    if (currency) {
      priceQuery.eq("currency_code", currency.toUpperCase());
    }

    const { data: tierPrice } = await priceQuery.limit(1).single();

    if (!tierPrice) {
      return new Response(
        JSON.stringify({
          error: `No price configured for ${billing_interval} billing with provider ${provider}`,
          provider,
          region: decision.region_code,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 8. Load adapter (map-based, no if/else chains)
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

    // 11. Return checkout URL + routing metadata
    return new Response(
      JSON.stringify({
        checkout_url: session.url,
        provider,
        region: decision.region_code,
        routing_reason: decision.reason,
        fallback_used: decision.fallback_used,
        routing_rule_id,
        cached: decision.cached,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const isClientError =
      message.startsWith("Unsupported billing country") ||
      message.startsWith("BillingRouter: country is required") ||
      message.startsWith("No available billing provider");

    console.error("create-checkout-session error:", message);

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: isClientError ? 400 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
