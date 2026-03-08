import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { score_id, competition_id, action } = body; // action: 'validate' | 'reject'

    if (!score_id || !competition_id || !action) {
      return new Response(
        JSON.stringify({ error: "score_id, competition_id, and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["validate", "reject"].includes(action)) {
      return new Response(JSON.stringify({ error: "action must be 'validate' or 'reject'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Only owner or super can validate
    const { data: isOwner } = await serviceClient.rpc("is_competition_owner", {
      p_user_id: user.id,
      p_competition_id: competition_id,
    });
    const { data: isSuper } = await serviceClient.rpc("is_super_user", {
      p_user_id: user.id,
    });

    if (!isOwner && !isSuper) {
      return new Response(JSON.stringify({ error: "Not authorized to validate scores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validationStatus = action === "validate" ? "validated" : "rejected";

    const { error: updateError } = await serviceClient
      .from("competition_scores")
      .update({ validation_status: validationStatus })
      .eq("id", score_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Audit
    await serviceClient.from("competition_audit_events").insert({
      competition_id,
      actor_id: user.id,
      event_type: action === "validate" ? "score_validate" : "score_reject",
      entity_type: "score",
      entity_id: score_id,
      payload: { action },
    });

    // If validated, trigger leaderboard recompute for the affected workout
    if (action === "validate") {
      const { data: scoreRow } = await serviceClient
        .from("competition_scores")
        .select("workout_id")
        .eq("id", score_id)
        .single();

      if (scoreRow) {
        // Recompute workout rankings
        await serviceClient.rpc("recompute_workout_rankings", {
          p_competition_id: competition_id,
          p_workout_id: scoreRow.workout_id,
        });
        // Recompute overall leaderboard
        await serviceClient.rpc("recompute_competition_leaderboard", {
          p_competition_id: competition_id,
        });
      }
    }

    return new Response(JSON.stringify({ status: validationStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
