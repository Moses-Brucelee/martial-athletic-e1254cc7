export type {
  Competition,
  Division,
  Team,
  Workout,
  Participant,
} from "@/domain/competition";

export interface CreateCompetitionInput {
  name: string;
  date?: string | null;
  venue?: string | null;
  type?: string | null;
  host_gym?: string | null;
  divisions?: string | null;
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
