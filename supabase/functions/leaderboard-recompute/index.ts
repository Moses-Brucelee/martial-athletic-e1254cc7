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
    const { competition_id, workout_id } = body;

    if (!competition_id) {
      return new Response(
        JSON.stringify({ error: "competition_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Only owner or super can trigger recompute
    const { data: isOwner } = await serviceClient.rpc("is_competition_owner", {
      p_user_id: user.id,
      p_competition_id: competition_id,
    });
    const { data: isSuper } = await serviceClient.rpc("is_super_user", {
      p_user_id: user.id,
    });

    if (!isOwner && !isSuper) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startTime = Date.now();

    if (workout_id) {
      // Recompute single workout rankings
      await serviceClient.rpc("recompute_workout_rankings", {
        p_competition_id: competition_id,
        p_workout_id: workout_id,
      });
    } else {
      // Recompute all workouts
      const { data: workouts } = await serviceClient
        .from("competition_workouts")
        .select("id")
        .eq("competition_id", competition_id);

      if (workouts) {
        for (const w of workouts) {
          await serviceClient.rpc("recompute_workout_rankings", {
            p_competition_id: competition_id,
            p_workout_id: w.id,
          });
        }
      }
    }

    // Recompute overall leaderboard
    await serviceClient.rpc("recompute_competition_leaderboard", {
      p_competition_id: competition_id,
    });

    const duration = Date.now() - startTime;

    // Audit
    await serviceClient.from("competition_audit_events").insert({
      competition_id,
      actor_id: user.id,
      event_type: "leaderboard_recompute",
      entity_type: "leaderboard",
      payload: { workout_id: workout_id ?? "all", duration_ms: duration },
    });

    return new Response(
      JSON.stringify({ status: "recomputed", duration_ms: duration }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
