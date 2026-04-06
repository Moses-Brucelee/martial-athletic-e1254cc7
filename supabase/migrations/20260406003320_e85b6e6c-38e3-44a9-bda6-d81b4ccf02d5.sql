-- Add progressive registration columns to competition_teams
ALTER TABLE public.competition_teams
  ADD COLUMN captain_user_id uuid DEFAULT NULL,
  ADD COLUMN invite_code text DEFAULT NULL,
  ADD COLUMN is_complete boolean NOT NULL DEFAULT false;

-- Unique constraint on invite_code (nulls allowed)
CREATE UNIQUE INDEX idx_teams_invite_code ON public.competition_teams (invite_code) WHERE invite_code IS NOT NULL;