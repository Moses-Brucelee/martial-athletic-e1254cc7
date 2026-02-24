export type { Participant } from "@/domain/competition";

export interface AthleteRegistration {
  id: string;
  competition_id: string;
  user_id: string | null;
  athlete_name: string;
  team_id: string | null;
  status: string;
  created_at: string;
}
