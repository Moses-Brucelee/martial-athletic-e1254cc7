import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is super user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user: caller } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!caller) throw new Error("Invalid token");

    const { data: superCheck } = await supabase
      .from("super_users")
      .select("user_id")
      .eq("user_id", caller.id)
      .maybeSingle();
    if (!superCheck) throw new Error("Not authorized — super user only");

    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id required");

    // Don't allow deleting yourself
    if (user_id === caller.id) throw new Error("Cannot delete yourself");

    // Delete profile first
    await supabase.from("profiles").delete().eq("user_id", user_id);
    await supabase.from("super_users").delete().eq("user_id", user_id);

    // Delete auth user
    const { error } = await supabase.auth.admin.deleteUser(user_id);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
