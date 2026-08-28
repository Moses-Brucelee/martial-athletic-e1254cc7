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
  reps_completed: number | null;
  time_seconds: number | null;
  load_value: number | null;
  points_awarded: number | null;
  tie_breaker_seconds: number | null;
  work_completed: number | null;
  heat_id: string | null;
  round_id: string | null;
  normalized_score: number | null;
  rank: number | null;
  idempotency_key: string | null;
  device_id: string | null;
  notes: string | null;
  video_url: string | null;
  video_verified: boolean;
  review_notes: string | null;
  validation_status: string;
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
  /** Shared placement — tied teams get the same rank. */
  overall_rank?: number;
  /** Number of 1st-place workout finishes. */
  wins?: number;
  /** Count of 1st places at index 0, 2nd places at index 1, and so on. */
  placement_counts?: number[];
}

export interface SeasonRanking {
  team_id: string;
  team_name: string;
  total_points: number;
}

// ── New Phase 1 Entities ──────────────────────────────────

export interface WorkoutRanking {
  id: string;
  competition_id: string;
  workout_id: string;
  team_id: string;
  division_id: string | null;
  normalized_score: number;
  rank: number;
  points_earned: number;
  recomputed_at: string;
}

export interface CachedLeaderboardEntry {
  id: string;
  competition_id: string;
  division_id: string | null;
  team_id: string;
  total_rank_sum: number;
  overall_rank: number;
  tie_broken_by: string | null;
  recomputed_at: string;
}

export interface LeaderboardSnapshot {
  id: string;
  competition_id: string;
  snapshot_data: unknown;
  triggered_by: string | null;
  created_at: string;
}
