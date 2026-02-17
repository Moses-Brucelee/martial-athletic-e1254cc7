import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STRIPE_API_VERSION = "2024-12-18.acacia";

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
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const appUrl = Deno.env.get("APP_URL")!;

    // User-scoped client for auth
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
        JSON.stringify({
          error: 'billing_interval must be "monthly" or "yearly"',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Service-role client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Fetch pricing tier
    const { data: tier, error: tierError } = await supabaseAdmin
      .from("pricing_tiers")
      .select("*")
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

    // 5. Resolve Stripe Price ID from DB
    const stripePriceId =
      billing_interval === "monthly"
        ? tier.stripe_price_id_monthly
        : tier.stripe_price_id_yearly;

    if (!stripePriceId) {
      return new Response(
        JSON.stringify({
          error: `This tier does not support ${billing_interval} billing`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 6. Initialize Stripe with locked API version
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: STRIPE_API_VERSION,
    });

    // 7. Lookup or create Stripe customer
    let stripeCustomerId: string;

    const { data: existingCustomer } = await supabaseAdmin
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (existingCustomer) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { user_id: userId },
      });
      stripeCustomerId = customer.id;

      const { error: insertError } = await supabaseAdmin
        .from("stripe_customers")
        .insert({
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
        });

      if (insertError) {
        console.error("Failed to insert stripe_customers row", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create customer record" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // 8. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/upgrade?status=success`,
      cancel_url: `${appUrl}/upgrade?status=cancel`,
      metadata: {
        user_id: userId,
        tier_id: tier_id,
        billing_interval: billing_interval,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          tier_id: tier_id,
        },
      },
    });

    // 9. Return checkout URL
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
