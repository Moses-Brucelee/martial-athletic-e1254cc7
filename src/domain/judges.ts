// Pure domain interfaces — no framework or DB imports

export interface Judge {
  id: string;
  competition_id: string;
  user_id: string;
  created_at: string;
}

export type CompetitionRole = 'owner' | 'judge' | 'viewer';
