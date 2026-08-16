import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_competitions",
  title: "List competitions",
  description:
    "List competitions visible to the signed-in user, optionally filtered by status or a name search.",
  inputSchema: {
    status: z
      .enum(["draft", "published", "live", "completed", "expired"])
      .optional()
      .describe("Filter by competition status."),
    search: z.string().trim().min(1).optional().describe("Case-insensitive match on the competition name."),
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum competitions to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, search, limit }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("competitions")
      .select("id, name, status, visibility, venue, host_gym, start_date, end_date, registration_deadline, competition_type")
      .order("start_date", { ascending: true, nullsFirst: false })
      .limit(limit ?? 20);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("name", `%${search}%`);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult({ count: data?.length ?? 0, competitions: data ?? [] });
  },
});
