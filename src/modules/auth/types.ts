export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  full_name: string | null;
  gender: string | null;
  age: number | null;
  date_of_birth: string | null;
  affiliation: string | null;
  about_me: string | null;
  profile_completed: boolean;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}
