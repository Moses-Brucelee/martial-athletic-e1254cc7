
ALTER TABLE public.competition_settings 
  ADD COLUMN IF NOT EXISTS ranking_direction text NOT NULL DEFAULT 'desc',
  ADD COLUMN IF NOT EXISTS setup_mode text NOT NULL DEFAULT 'advanced';

ALTER TABLE public.competitions 
  ADD COLUMN IF NOT EXISTS max_teams integer,
  ADD COLUMN IF NOT EXISTS waitlist_enabled boolean NOT NULL DEFAULT true;
