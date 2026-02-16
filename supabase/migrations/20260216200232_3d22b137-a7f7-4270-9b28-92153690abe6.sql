
-- 1. Extend profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS affiliation text,
  ADD COLUMN IF NOT EXISTS about_me text,
  ADD COLUMN IF NOT EXISTS profile_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free';

-- 2. Create competitions table
CREATE TABLE public.competitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid NOT NULL,
  name text NOT NULL,
  date date,
  venue text,
  type text,
  host_gym text,
  divisions text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all competitions" ON public.competitions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own competitions" ON public.competitions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own competitions" ON public.competitions
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own competitions" ON public.competitions
  FOR DELETE USING (auth.uid() = created_by);

CREATE TRIGGER update_competitions_updated_at
  BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create competition_workouts table
CREATE TABLE public.competition_workouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  workout_number integer NOT NULL,
  measurement_type text NOT NULL DEFAULT 'reps',
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competition_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workouts" ON public.competition_workouts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Competition owner can insert workouts" ON public.competition_workouts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.competitions WHERE id = competition_id AND created_by = auth.uid())
  );

CREATE POLICY "Competition owner can update workouts" ON public.competition_workouts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.competitions WHERE id = competition_id AND created_by = auth.uid())
  );

CREATE POLICY "Competition owner can delete workouts" ON public.competition_workouts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.competitions WHERE id = competition_id AND created_by = auth.uid())
  );

-- 4. Create competition_teams table
CREATE TABLE public.competition_teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  division text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.competition_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view teams" ON public.competition_teams
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Competition owner can insert teams" ON public.competition_teams
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.competitions WHERE id = competition_id AND created_by = auth.uid())
  );

CREATE POLICY "Competition owner can update teams" ON public.competition_teams
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.competitions WHERE id = competition_id AND created_by = auth.uid())
  );

CREATE POLICY "Competition owner can delete teams" ON public.competition_teams
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.competitions WHERE id = competition_id AND created_by = auth.uid())
  );

-- 5. Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
