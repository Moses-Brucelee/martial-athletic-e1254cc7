import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_programs",
  title: "List training programs",
  description: "List training programs the signed-in user can access (their own plus public published programs).",
  inputSchema: {
    category: z.string().trim().min(1).optional().describe("Filter by program category."),
    level: z.string().trim().min(1).optional().describe("Filter by difficulty level."),
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum programs to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, level, limit }, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("programs")
      .select("id, title, description, category, level, weeks_count, days_per_week, equipment, is_public, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (category) query = query.eq("category", category);
    if (level) query = query.eq("level", level);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult({ count: data?.length ?? 0, programs: data ?? [] });
  },
});
