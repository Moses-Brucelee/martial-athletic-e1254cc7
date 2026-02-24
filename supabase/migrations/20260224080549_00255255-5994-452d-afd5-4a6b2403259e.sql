
-- Part 1A: Add date_of_birth to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Part 1B: Add age category fields to competitions
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS age_category_type text DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS min_age integer,
  ADD COLUMN IF NOT EXISTS max_age integer;

-- Part 1C: Create athlete_registrations table
CREATE TABLE IF NOT EXISTS public.athlete_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id uuid,
  athlete_name text NOT NULL,
  team_id uuid REFERENCES public.competition_teams(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.athlete_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "registrations_select" ON public.athlete_registrations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "registrations_insert" ON public.athlete_registrations
  FOR INSERT WITH CHECK (
    (is_competition_owner(auth.uid(), competition_id) AND has_competition_access(auth.uid()))
    OR (user_id = auth.uid())
    OR is_super_user(auth.uid())
  );

CREATE POLICY "registrations_update" ON public.athlete_registrations
  FOR UPDATE USING (
    (is_competition_owner(auth.uid(), competition_id) AND has_competition_access(auth.uid()))
    OR is_super_user(auth.uid())
  );

CREATE POLICY "registrations_delete" ON public.athlete_registrations
  FOR DELETE USING (
    (is_competition_owner(auth.uid(), competition_id) AND has_competition_access(auth.uid()))
    OR is_super_user(auth.uid())
  );

-- Enable realtime for athlete_registrations
ALTER PUBLICATION supabase_realtime ADD TABLE public.athlete_registrations;

-- Part 1D: Create brackets table
CREATE TABLE IF NOT EXISTS public.brackets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  division_id uuid REFERENCES public.competition_divisions(id) ON DELETE SET NULL,
  name text NOT NULL,
  bracket_type text NOT NULL DEFAULT 'single_elimination',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brackets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brackets_select" ON public.brackets
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "brackets_insert" ON public.brackets
  FOR INSERT WITH CHECK (
    (is_competition_owner(auth.uid(), competition_id) AND has_competition_access(auth.uid()))
    OR is_super_user(auth.uid())
  );

CREATE POLICY "brackets_update" ON public.brackets
  FOR UPDATE USING (
    (is_competition_owner(auth.uid(), competition_id) AND has_competition_access(auth.uid()))
    OR is_super_user(auth.uid())
  );

CREATE POLICY "brackets_delete" ON public.brackets
  FOR DELETE USING (
    (is_competition_owner(auth.uid(), competition_id) AND has_competition_access(auth.uid()))
    OR is_super_user(auth.uid())
  );

-- Part 1E: Create bouts table
CREATE TABLE IF NOT EXISTS public.bouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bracket_id uuid NOT NULL REFERENCES public.brackets(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  bout_number integer NOT NULL,
  team_a_id uuid REFERENCES public.competition_teams(id) ON DELETE SET NULL,
  team_b_id uuid REFERENCES public.competition_teams(id) ON DELETE SET NULL,
  winner_id uuid REFERENCES public.competition_teams(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bouts_select" ON public.bouts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "bouts_insert" ON public.bouts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brackets b
      WHERE b.id = bouts.bracket_id
      AND (is_competition_owner(auth.uid(), b.competition_id) OR is_super_user(auth.uid()))
    )
  );

CREATE POLICY "bouts_update" ON public.bouts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.brackets b
      WHERE b.id = bouts.bracket_id
      AND (is_competition_owner(auth.uid(), b.competition_id) OR is_super_user(auth.uid()))
    )
  );

CREATE POLICY "bouts_delete" ON public.bouts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.brackets b
      WHERE b.id = bouts.bracket_id
      AND (is_competition_owner(auth.uid(), b.competition_id) OR is_super_user(auth.uid()))
    )
  );
