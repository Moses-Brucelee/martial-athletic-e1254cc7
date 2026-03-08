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

    // Verify the user
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
    const {
      competition_id,
      workout_id,
      team_id,
      score,
      reps_completed,
      time_seconds,
      load_value,
      points_awarded,
      heat_id,
      round_id,
      notes,
      video_url,
      device_id,
      idempotency_key,
    } = body;

    // Validate required fields
    if (!competition_id || !workout_id || !team_id) {
      return new Response(
        JSON.stringify({ error: "competition_id, workout_id, and team_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (score == null && reps_completed == null && time_seconds == null && load_value == null && points_awarded == null) {
      return new Response(
        JSON.stringify({ error: "At least one score field is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Score range validation
    const numScore = Number(score ?? 0);
    if (numScore < 0 || numScore > 999999) {
      return new Response(
        JSON.stringify({ error: "Score must be between 0 and 999,999" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check idempotency
    if (idempotency_key) {
      const { data: existing } = await serviceClient
        .from("competition_scores")
        .select("id")
        .eq("idempotency_key", idempotency_key)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ id: existing.id, deduplicated: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Verify user is judge or owner
    const { data: isJudge } = await serviceClient.rpc("is_competition_judge", {
      p_user_id: user.id,
      p_competition_id: competition_id,
    });
    const { data: isOwner } = await serviceClient.rpc("is_competition_owner", {
      p_user_id: user.id,
      p_competition_id: competition_id,
    });
    const { data: isSuper } = await serviceClient.rpc("is_super_user", {
      p_user_id: user.id,
    });

    if (!isJudge && !isOwner && !isSuper) {
      return new Response(JSON.stringify({ error: "Not authorized to submit scores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check workout is not locked
    const { data: workout } = await serviceClient
      .from("competition_workouts")
      .select("is_locked, scoring_type")
      .eq("id", workout_id)
      .single();
    if (workout?.is_locked) {
      return new Response(JSON.stringify({ error: "Workout is locked" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check competition is mutable
    const { data: compStatus } = await serviceClient.rpc("get_competition_status", {
      p_competition_id: competition_id,
    });
    if (compStatus === "completed" || compStatus === "expired") {
      return new Response(JSON.stringify({ error: "Competition is locked" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize score based on workout scoring type
    const scoringType = workout?.scoring_type ?? "points";
    let normalizedScore = numScore;
    if (scoringType === "time" && time_seconds != null) normalizedScore = time_seconds;
    else if (scoringType === "reps" && reps_completed != null) normalizedScore = reps_completed;
    else if (scoringType === "load" && load_value != null) normalizedScore = load_value;
    else if (scoringType === "points" && points_awarded != null) normalizedScore = points_awarded;

    // Upsert score
    const { data: scoreData, error: scoreError } = await serviceClient
      .from("competition_scores")
      .upsert(
        {
          competition_id,
          workout_id,
          team_id,
          score: numScore,
          judge_id: user.id,
          reps_completed: reps_completed ?? null,
          time_seconds: time_seconds ?? null,
          load_value: load_value ?? null,
          points_awarded: points_awarded ?? null,
          heat_id: heat_id ?? null,
          round_id: round_id ?? null,
          normalized_score: normalizedScore,
          notes: notes ?? null,
          video_url: video_url ?? null,
          device_id: device_id ?? null,
          idempotency_key: idempotency_key ?? null,
          validation_status: "pending",
        },
        { onConflict: "team_id,workout_id" }
      )
      .select("id")
      .single();

    if (scoreError) {
      return new Response(JSON.stringify({ error: scoreError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Write audit event
    await serviceClient.from("competition_audit_events").insert({
      competition_id,
      actor_id: user.id,
      event_type: "score_submit",
      entity_type: "score",
      entity_id: scoreData.id,
      payload: { team_id, workout_id, score: numScore, normalized_score: normalizedScore },
      device_id: device_id ?? null,
    });

    return new Response(JSON.stringify({ id: scoreData.id, normalized_score: normalizedScore }), {
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
