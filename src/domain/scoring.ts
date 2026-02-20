// Pure domain interfaces — no framework or DB imports

export interface Score {
  id: string;
  competition_id: string;
  team_id: string;
  workout_id: string;
  score: number;
  judge_id: string | null;
  locked: boolean;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScoringEvent {
  id: string;
  competition_id: string | null;
  team_id: string | null;
  judge_id: string | null;
  score_id: string | null;
  event_type: string;
  payload: unknown;
  created_at: string;
}

export interface LeaderboardEntry {
  division_id: string | null;
  division_name: string | null;
  team_id: string;
  team_name: string;
  total_points: number;
}

export interface SeasonRanking {
  team_id: string;
  team_name: string;
  total_points: number;
}
