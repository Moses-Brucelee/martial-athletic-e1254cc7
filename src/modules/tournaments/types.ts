export type {
  Competition,
  Division,
  Team,
  Workout,
  WorkoutMovement,
  Participant,
  Bracket,
  Bout,
  AthleteRegistration,
  CompetitionType,
  CompetitionSettings,
  CompetitionRound,
  WorkoutConfig,
  Heat,
  HeatAssignment,
  JudgeAssignment,
  CompetitionTemplate,
  CompetitionAuditEvent,
} from "@/domain/competition";

export interface CreateCompetitionInput {
  name: string;
  description?: string | null;
  date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  registration_deadline?: string | null;
  venue?: string | null;
  type?: string | null;
  competition_type?: string | null;
  host_gym?: string | null;
  divisions?: string | null;
  age_category_type?: string | null;
  min_age?: number | null;
  max_age?: number | null;
  created_by: string;
}

export interface AddTeamInput {
  competition_id: string;
  team_name: string;
  division?: string | null;
  division_id?: string | null;
}

export interface AddWorkoutInput {
  competition_id: string;
  workout_number: number;
  measurement_type: string;
  workout_type?: string;
  time_cap_seconds?: number | null;
  scoring_type?: string;
  round_id?: string | null;
}

export interface CreateBracketInput {
  competition_id: string;
  division_id?: string | null;
  name: string;
  bracket_type?: string;
}

export interface SaveWorkoutWithMovementsInput {
  competition_id: string;
  workout_number: number;
  name?: string | null;
  description?: string | null;
  workout_type: string;
  time_cap_seconds?: number | null;
  scoring_type: string;
  measurement_type: string;
  round_id?: string | null;
  movements: {
    movement_name: string;
    reps: number | null;
    weight: number | null;
    unit: string;
    sequence_order: number;
    distance?: number | null;
    calories?: number | null;
    description?: string | null;
    video_url?: string | null;
  }[];
}

export interface AddRoundInput {
  competition_id: string;
  name: string;
  round_number: number;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  scoring_weight?: number;
}

export interface AddHeatInput {
  competition_id: string;
  workout_id?: string | null;
  round_id?: string | null;
  heat_number: number;
  lane_count?: number;
  scheduled_start?: string | null;
}

export interface AssignJudgeInput {
  competition_id: string;
  judge_id: string;
  heat_id?: string | null;
  workout_id?: string | null;
  lane_number?: number | null;
}
