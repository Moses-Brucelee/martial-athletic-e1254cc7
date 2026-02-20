import { supabase } from "@/integrations/supabase/client";
import type { LeaderboardEntry, SeasonRanking } from "@/domain/scoring";

export async function fetchCompetitionLeaderboard(competitionId: string): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_competition_leaderboard", {
    p_competition_id: competitionId,
  });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    division_id: row.division_id,
    division_name: row.division_name,
    team_id: row.team_id,
    team_name: row.team_name,
    total_points: Number(row.total_points),
  }));
}

export async function fetchSeasonLeaderboard(seasonId: string): Promise<SeasonRanking[]> {
  const { data, error } = await supabase.rpc("get_season_leaderboard", {
    p_season_id: seasonId,
  });

  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    team_id: row.team_id,
    team_name: row.team_name,
    total_points: Number(row.total_points),
  }));
}
