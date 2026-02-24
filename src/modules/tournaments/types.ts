export type {
  Competition,
  Division,
  Team,
  Workout,
  Participant,
  Bracket,
  Bout,
  AthleteRegistration,
} from "@/domain/competition";

export interface CreateCompetitionInput {
  name: string;
  date?: string | null;
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
}

export interface CreateBracketInput {
  competition_id: string;
  division_id?: string | null;
  name: string;
  bracket_type?: string;
}
