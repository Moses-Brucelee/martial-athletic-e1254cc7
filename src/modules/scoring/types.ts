export type { Score, ScoringEvent, LeaderboardEntry, SeasonRanking } from "@/domain/scoring";

export interface ScoreEntry {
  team_id: string;
  workout_id: string;
  score: number;
}

export interface ScoreMap {
  [teamWorkoutKey: string]: string;
}
