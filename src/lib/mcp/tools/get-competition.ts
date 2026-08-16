import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_competition",
  title: "Get competition details",
  description:
    "Return one competition with its divisions and visible workouts, as the signed-in user is allowed to see them.",
  inputSchema: {
    competition_id: z.string().uuid().describe("The competition UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ competition_id }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const supabase = supabaseForUser(ctx);

    const { data: competition, error } = await supabase
      .from("competitions")
      .select("*")
      .eq("id", competition_id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!competition) return errorResult("Competition not found, or you do not have access to it.");

    const [{ data: divisions }, { data: workouts }] = await Promise.all([
      supabase
        .from("competition_divisions")
        .select("id, name, team_size, max_athletes, sort_order")
        .eq("competition_id", competition_id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("competition_workouts")
        .select("id, workout_number, name, description, workout_type, scoring_type, time_cap_seconds, visibility, display_order")
        .eq("competition_id", competition_id)
        .order("display_order", { ascending: true }),
    ]);

    return textResult({ competition, divisions: divisions ?? [], workouts: workouts ?? [] });
  },
});
