import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_my_registrations",
  title: "List my registrations",
  description: "List competition registrations belonging to the signed-in user (as athlete or registrant).",
  inputSchema: {
    competition_id: z.string().uuid().optional().describe("Restrict to a single competition."),
    limit: z.number().int().min(1).max(50).default(25).describe("Maximum registrations to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ competition_id, limit }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const userId = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("athlete_registrations")
      .select("id, competition_id, athlete_name, status, payment_status, registration_type, division_id, team_id, created_at")
      .or(`user_id.eq.${userId},registered_by_user_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (competition_id) query = query.eq("competition_id", competition_id);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult({ count: data?.length ?? 0, registrations: data ?? [] });
  },
});
