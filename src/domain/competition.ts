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
  poster_url: string | null;
  created_by: string;
  season_id: string | null;
  age_category_type: string | null;
  min_age: number | null;
  max_age: number | null;
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
  created_at: string;
}
