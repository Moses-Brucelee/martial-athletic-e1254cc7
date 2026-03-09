
-- 1. Create athletes table (independent athlete identities)
CREATE TABLE public.athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  gender text,
  date_of_birth date,
  user_id uuid,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Extend athlete_registrations with new columns
ALTER TABLE public.athlete_registrations
  ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES public.athletes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS division_id uuid REFERENCES public.competition_divisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS registered_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS registration_type text NOT NULL DEFAULT 'self',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3. RLS for athletes table
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "athletes_select" ON public.athletes
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "athletes_insert" ON public.athletes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "athletes_update" ON public.athletes
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR created_by_user_id = auth.uid()
    OR is_super_user(auth.uid())
  );

CREATE POLICY "athletes_delete" ON public.athletes
  FOR DELETE TO authenticated
  USING (
    created_by_user_id = auth.uid()
    OR is_super_user(auth.uid())
  );

-- 4. Index for athlete lookups
CREATE INDEX IF NOT EXISTS idx_athletes_user_id ON public.athletes(user_id);
CREATE INDEX IF NOT EXISTS idx_athletes_email ON public.athletes(email);
CREATE INDEX IF NOT EXISTS idx_athlete_registrations_athlete_id ON public.athlete_registrations(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athlete_registrations_division_id ON public.athlete_registrations(division_id);

-- 5. Updated_at trigger for athletes
CREATE TRIGGER set_athletes_updated_at
  BEFORE UPDATE ON public.athletes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Updated_at trigger for athlete_registrations
CREATE TRIGGER set_registrations_updated_at
  BEFORE UPDATE ON public.athlete_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
