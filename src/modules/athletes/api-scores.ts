import { supabase } from "@/integrations/supabase/client";
import type { AthleteRegistration } from "@/domain/competition";

/** Get scores for a specific athlete in a specific competition */
export async function fetchAthleteCompetitionScores(userId: string, competitionId: string) {
  // Get the user's registration
  const { data: reg, error: regErr } = await supabase
    .from("athlete_registrations")
    .select("*")
    .eq("competition_id", competitionId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (regErr) throw regErr;

  // Get participant → team mapping
  const { data: participants, error: pErr } = await supabase
    .from("competition_participants")
    .select("team_id")
    .eq("competition_id", competitionId)
    .eq("user_id", userId);
  if (pErr) throw pErr;

  const teamIds = participants?.map((p) => p.team_id) ?? [];

  // Also check if reg has a team_id
  if (reg?.team_id && !teamIds.includes(reg.team_id)) {
    teamIds.push(reg.team_id);
  }

  if (teamIds.length === 0) {
    return {
      registration: reg as AthleteRegistration | null,
      scores: [] as any[],
    };
  }

  const { data: scores, error: sErr } = await supabase
    .from("competition_scores")
    .select("*")
    .eq("competition_id", competitionId)
    .in("team_id", teamIds)
    .order("created_at");
  if (sErr) throw sErr;

  return {
    registration: reg as AthleteRegistration | null,
    scores: scores ?? [],
  };
}
