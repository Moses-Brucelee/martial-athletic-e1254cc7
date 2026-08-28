// Pure domain interfaces — no framework or DB imports

export interface Competition {
  id: string;
  name: string;
  description: string | null;
  date: string | null;
  start_date: string | null;
  end_date: string | null;
  registration_deadline: string | null;
  venue: string | null;
  host_gym: string | null;
  type: string | null;
  competition_type: string | null;
  divisions: string | null;
  status: string;
  poster_url: string | null;
  created_by: string;
  season_id: string | null;
  age_category_type: string | null;
  min_age: number | null;
  max_age: number | null;
  max_teams: number | null;
  waitlist_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Division {
  id: string;
  competition_id: string;
  name: string;
  sort_order: number;
  team_size: number;
  created_at: string;
}

export interface Team {
  id: string;
  competition_id: string;
  team_name: string;
  division: string | null;
  division_id: string | null;
  captain_user_id: string | null;
  invite_code: string | null;
  is_complete: boolean;
  created_at: string;
}

export interface Workout {
  id: string;
  competition_id: string;
  workout_number: number;
  measurement_type: string;
  workout_type: string;
  time_cap_seconds: number | null;
  scoring_type: string;
  name: string | null;
  description: string | null;
  display_order: number;
  is_locked: boolean;
  visibility: string;
  scheduled_reveal_at: string | null;
  round_id: string | null;
  /** Optional workout tie breaker: 'none' | 'time'. */
  tie_breaker_type?: string | null;
  /** Prescribed work for a "For Time" workout (e.g. 300). */
  target_work?: number | null;
  /** Unit for target_work: reps | rounds | distance | calories. */
  target_unit?: string | null;
  created_at: string;
}

export interface WorkoutMovement {
  id: string;
  workout_id: string;
  movement_name: string;
  reps: number | null;
  weight: number | null;
  unit: string;
  sequence_order: number;
  created_at: string;
}

export interface Participant {
  id: string;
  competition_id: string;
  team_id: string;
  user_id: string | null;
  athlete_name: string;
  created_at: string;
}

export interface Bracket {
  id: string;
  competition_id: string;
  division_id: string | null;
  name: string;
  bracket_type: string;
  created_at: string;
}

export interface Bout {
  id: string;
  bracket_id: string;
  round_number: number;
  bout_number: number;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_id: string | null;
  status: string;
  created_at: string;
}

export interface AthleteRegistration {
  id: string;
  competition_id: string;
  user_id: string | null;
  athlete_name: string;
  team_id: string | null;
  status: string;
  athlete_id: string | null;
  division_id: string | null;
  registered_by_user_id: string | null;
  registration_type: string;
  payment_status: string;
  notes: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
}

export interface Athlete {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  user_id: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── New Phase 1 Entities ──────────────────────────────────

export interface CompetitionType {
  key: string;
  label: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface CompetitionSettings {
  id: string;
  competition_id: string;
  timezone: string;
  scoring_method: string;
  tie_breaker_policy: string;
  allow_remote_submissions: boolean;
  require_video_verification: boolean;
  auto_publish_leaderboard: boolean;
  settings_json: unknown;
  ranking_direction: string;
  setup_mode: string;
  /** 'none' | 'most_wins_placements' */
  global_tie_breaker?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitionRound {
  id: string;
  competition_id: string;
  name: string;
  round_number: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  status: string;
  scoring_weight: number;
  created_at: string;
}

export interface WorkoutConfig {
  id: string;
  workout_id: string;
  config: unknown;
  created_at: string;
  updated_at: string;
}

export interface Heat {
  id: string;
  competition_id: string;
  workout_id: string | null;
  round_id: string | null;
  heat_number: number;
  lane_count: number;
  scheduled_start: string | null;
  duration_minutes?: number | null;
  status: string;
  created_at: string;
}

export interface HeatAssignment {
  id: string;
  heat_id: string;
  team_id: string | null;
  athlete_registration_id?: string | null;
  lane_number: number | null;
  created_at: string;
}


export interface JudgeAssignment {
  id: string;
  competition_id: string;
  judge_id: string;
  heat_id: string | null;
  workout_id: string | null;
  lane_number: number | null;
  created_at: string;
}

export interface CompetitionTemplate {
  id: string;
  name: string;
  competition_type: string;
  description: string | null;
  template_data: unknown;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
}

export interface CompetitionAuditEvent {
  id: string;
  competition_id: string;
  actor_id: string | null;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: unknown;
  device_id: string | null;
  ip_address: string | null;
  created_at: string;
}
