import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "./types";

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data as unknown as Profile;
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update(updates as Record<string, unknown>)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function checkCompetitionRole(competitionId: string, userId: string) {
  const [compRes, judgeRes] = await Promise.all([
    supabase
      .from("competitions")
      .select("created_by")
      .eq("id", competitionId)
      .single(),
    supabase
      .from("competition_judges")
      .select("id")
      .eq("competition_id", competitionId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const isOwner = compRes.data?.created_by === userId;
  const isJudge = !!judgeRes.data;

  return { isOwner, isJudge, role: isOwner ? "owner" as const : isJudge ? "judge" as const : "viewer" as const };
}
