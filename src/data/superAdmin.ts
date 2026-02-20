import { supabase } from "@/integrations/supabase/client";

export async function checkIsSuperUser(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("super_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

export async function fetchAllCompetitions() {
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function reassignCompetitionOwner(competitionId: string, newOwnerId: string): Promise<void> {
  const { error } = await supabase
    .from("competitions")
    .update({ created_by: newOwnerId })
    .eq("id", competitionId);

  if (error) throw error;
}
