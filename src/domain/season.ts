// Pure domain interfaces — no framework or DB imports

export interface Season {
  id: string;
  name: string;
  year: number;
  created_at: string;
}

export interface SeasonCompetition {
  id: string;
  season_id: string;
  competition_id: string;
}

export interface SeasonLeaderboardEntry {
  team_id: string;
  team_name: string;
  total_points: number;
}
