
-- Phase 1A: Add lifecycle columns to competitions
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS start_date timestamptz,
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS registration_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS description text;

-- Phase 1B: Create workout_movements table
CREATE TABLE public.workout_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id uuid NOT NULL REFERENCES public.competition_workouts(id) ON DELETE CASCADE,
  movement_name text NOT NULL,
  reps integer,
  weight numeric,
  unit text DEFAULT 'kg',
  sequence_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movements_select" ON public.workout_movements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "movements_insert" ON public.workout_movements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.competition_workouts w
      WHERE w.id = workout_movements.workout_id
      AND (
        is_competition_owner(auth.uid(), w.competition_id)
        OR is_super_user(auth.uid())
      )
    )
  );

CREATE POLICY "movements_update" ON public.workout_movements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.competition_workouts w
      WHERE w.id = workout_movements.workout_id
      AND (
        is_competition_owner(auth.uid(), w.competition_id)
        OR is_super_user(auth.uid())
      )
    )
  );

CREATE POLICY "movements_delete" ON public.workout_movements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.competition_workouts w
      WHERE w.id = workout_movements.workout_id
      AND (
        is_competition_owner(auth.uid(), w.competition_id)
        OR is_super_user(auth.uid())
      )
    )
  );

-- Phase 1C: Add columns to competition_workouts
ALTER TABLE public.competition_workouts
  ADD COLUMN IF NOT EXISTS workout_type text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS time_cap_seconds integer,
  ADD COLUMN IF NOT EXISTS scoring_type text NOT NULL DEFAULT 'reps';

-- Phase 1D: Add columns to competition_scores
ALTER TABLE public.competition_scores
  ADD COLUMN IF NOT EXISTS reps_completed integer,
  ADD COLUMN IF NOT EXISTS time_seconds integer,
  ADD COLUMN IF NOT EXISTS load_value numeric,
  ADD COLUMN IF NOT EXISTS points_awarded numeric;

-- Phase 1E: Server-side status derivation function
CREATE OR REPLACE FUNCTION public.get_competition_status(p_competition_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    CASE
      WHEN c.status = 'draft' THEN 'draft'
      WHEN c.end_date IS NOT NULL AND now() > c.end_date + interval '30 days' THEN 'expired'
      WHEN c.end_date IS NOT NULL AND now() > c.end_date THEN 'completed'
      WHEN c.start_date IS NOT NULL AND now() >= c.start_date AND (c.end_date IS NULL OR now() <= c.end_date) THEN 'live'
      WHEN c.registration_deadline IS NOT NULL AND now() < c.registration_deadline THEN 'published'
      WHEN c.start_date IS NOT NULL AND now() < c.start_date THEN 'published'
      ELSE c.status
    END
  FROM public.competitions c
  WHERE c.id = p_competition_id;
$$;
