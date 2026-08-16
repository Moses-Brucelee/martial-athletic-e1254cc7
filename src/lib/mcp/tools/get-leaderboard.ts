import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_leaderboard",
  title: "Get competition leaderboard",
  description: "Return the current leaderboard standings for a competition, grouped by division.",
  inputSchema: {
    competition_id: z.string().uuid().describe("The competition UUID."),
    division_id: z.string().uuid().optional().describe("Only return standings for this division."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ competition_id, division_id }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("get_competition_leaderboard", {
      p_competition_id: competition_id,
    });
    if (error) return errorResult(error.message);
    const rows = (data ?? []).filter((row) => !division_id || row.division_id === division_id);
    return textResult({ count: rows.length, standings: rows });
  },
});
