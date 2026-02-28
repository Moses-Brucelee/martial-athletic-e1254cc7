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
  workout_type: string;
  time_cap_seconds?: number | null;
  scoring_type: string;
  measurement_type: string;
  movements: {
    movement_name: string;
    reps: number | null;
    weight: number | null;
    unit: string;
    sequence_order: number;
  }[];
}
