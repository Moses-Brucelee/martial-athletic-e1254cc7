import { supabase } from "@/integrations/supabase/client";
import type { Judge } from "@/domain/judges";

export async function fetchJudges(competitionId: string): Promise<Judge[]> {
  const { data, error } = await supabase
    .from("competition_judges")
    .select("*")
    .eq("competition_id", competitionId);

  if (error) throw error;
  return data as Judge[];
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
