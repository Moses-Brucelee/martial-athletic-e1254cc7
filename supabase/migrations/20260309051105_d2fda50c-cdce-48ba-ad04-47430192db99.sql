
-- Add max_athletes to competitions
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS max_athletes integer DEFAULT NULL;

-- Add max_athletes to competition_divisions  
ALTER TABLE public.competition_divisions ADD COLUMN IF NOT EXISTS max_athletes integer DEFAULT NULL;
