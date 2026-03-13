import { supabase } from "@/integrations/supabase/client";
import type { Judge } from "@/domain/judges";

export async function fetchJudges(competitionId: string): Promise<Judge[]> {
  const { data, error } = await supabase
    .from("competition_judges")
    .select("*, profiles!competition_judges_user_id_fkey(display_name)")
    .eq("competition_id", competitionId);

  if (error) {
    // Fallback without join if FK relationship not found
    const { data: fallback, error: fbErr } = await supabase
      .from("competition_judges")
      .select("*")
      .eq("competition_id", competitionId);
    if (fbErr) throw fbErr;
    return (fallback ?? []) as Judge[];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    competition_id: row.competition_id,
    user_id: row.user_id,
    display_name: row.profiles?.display_name ?? null,
    created_at: row.created_at,
  })) as Judge[];
}

export async function addJudge(competitionId: string, userId: string): Promise<Judge> {
  const { data, error } = await supabase
    .from("competition_judges")
    .insert({ competition_id: competitionId, user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return data as Judge;
}

export async function removeJudge(judgeId: string): Promise<void> {
  const { error } = await supabase
    .from("competition_judges")
    .delete()
    .eq("id", judgeId);

  if (error) throw error;
}

/**
 * Search registered athletes in a competition who have a user_id (registered users).
 * Returns matching athletes for judge auto-suggest.
 */
export async function searchRegisteredUsers(
  competitionId: string,
  query: string
): Promise<{ user_id: string; athlete_name: string; display_name: string | null }[]> {
  const { data, error } = await supabase
    .from("athlete_registrations")
    .select("user_id, athlete_name")
    .eq("competition_id", competitionId)
    .not("user_id", "is", null)
    .ilike("athlete_name", `%${query}%`)
    .limit(10);

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    user_id: row.user_id,
    athlete_name: row.athlete_name,
    display_name: row.athlete_name,
  }));
}

export async function findUserByEmail(email: string): Promise<{ user_id: string; display_name: string | null } | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .ilike("display_name", email)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
