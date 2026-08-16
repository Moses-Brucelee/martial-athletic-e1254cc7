import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, requireAuth, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Get my profile",
  description: "Return the signed-in user's Martial Athletic athlete profile.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const unauth = requireAuth(ctx);
    if (unauth) return unauth;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, display_name, gender, date_of_birth, affiliation, about_me, subscription_tier, profile_completed")
      .eq("user_id", ctx.getUserId()!)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("No profile found for this account yet.");
    return textResult(data);
  },
});
