// Pure domain interfaces — no framework or DB imports

export interface Competition {
  id: string;
  name: string;
  date: string | null;
  venue: string | null;
  host_gym: string | null;
  type: string | null;
  divisions: string | null;
  status: string;
  created_by: string;
  season_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Division {
  id: string;
  competition_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Team {
  id: string;
  competition_id: string;
  team_name: string;
  division: string | null;
  division_id: string | null;
  created_at: string;
}

export interface Workout {
  id: string;
  competition_id: string;
  workout_number: number;
  measurement_type: string;
  name: string | null;
  is_locked: boolean;
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
