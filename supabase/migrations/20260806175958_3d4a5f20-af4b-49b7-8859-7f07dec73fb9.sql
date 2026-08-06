-- ============ MOVEMENT CATALOGUE ============
CREATE TABLE public.movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.movements TO authenticated, anon;
GRANT ALL ON public.movements TO service_role;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movements_read_all" ON public.movements FOR SELECT USING (true);
CREATE POLICY "movements_super_manage" ON public.movements FOR ALL TO authenticated
  USING (public.is_super_user(auth.uid())) WITH CHECK (public.is_super_user(auth.uid()));

INSERT INTO public.movements (name, category) VALUES
  ('Back Squat','strength'),('Front Squat','strength'),('Overhead Squat','strength'),
  ('Deadlift','strength'),('Sumo Deadlift','strength'),('Bench Press','strength'),
  ('Strict Press','strength'),('Push Press','strength'),('Push Jerk','strength'),
  ('Power Clean','weightlifting'),('Squat Clean','weightlifting'),('Clean & Jerk','weightlifting'),
  ('Snatch','weightlifting'),('Power Snatch','weightlifting'),('Hang Clean','weightlifting'),
  ('Pull-ups','gymnastics'),('Chest to Bar Pull-ups','gymnastics'),('Toes to Bar','gymnastics'),
  ('Muscle-ups','gymnastics'),('Ring Dips','gymnastics'),('Handstand Push-ups','gymnastics'),
  ('Handstand Walk','gymnastics'),('Wall Walks','gymnastics'),('Rope Climb','gymnastics'),
  ('Push-ups','gymnastics'),('Air Squats','gymnastics'),('Pistol Squats','gymnastics'),
  ('Burpees','conditioning'),('Box Jump','conditioning'),('Double Unders','conditioning'),
  ('Wall Ball','conditioning'),('Thruster','conditioning'),('Kettlebell Swing','conditioning'),
  ('Dumbbell Snatch','conditioning'),('Farmers Carry','conditioning'),('Sled Push','conditioning'),
  ('Sled Pull','conditioning'),('Row','cardio'),('Ski Erg','cardio'),('Assault Bike','cardio'),
  ('Echo Bike','cardio'),('Run','cardio'),('Swim','cardio'),
  ('Barbell Row','accessory'),('Dumbbell Bench Press','accessory'),('Bicep Curl','accessory'),
  ('Tricep Extension','accessory'),('Lateral Raise','accessory'),('Back Extension','accessory'),
  ('GHD Sit-ups','accessory'),('Plank','core'),('Hollow Hold','core'),('Russian Twist','core'),
  ('Couch Stretch','mobility'),('Pigeon Pose','mobility'),('Shoulder Pass Through','mobility'),
  ('Banded Distraction','mobility'),('Foam Roll','mobility');

-- ============ PROGRAM TEMPLATES ============
CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'strength',
  level text NOT NULL DEFAULT 'all',
  weeks_count integer NOT NULL DEFAULT 1,
  days_per_week integer NOT NULL DEFAULT 3,
  equipment text[] NOT NULL DEFAULT '{}',
  cover_url text,
  status text NOT NULL DEFAULT 'draft',
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated;
GRANT SELECT ON public.programs TO anon;
GRANT ALL ON public.programs TO service_role;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- ============ ENROLLMENTS (table first; policies further below) ============
CREATE TABLE public.program_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_by uuid,
  source text NOT NULL DEFAULT 'self',
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT current_date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_enrollments TO authenticated;
GRANT ALL ON public.program_enrollments TO service_role;
ALTER TABLE public.program_enrollments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_program_owner(p_user_id uuid, p_program_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.programs WHERE id = p_program_id AND created_by = p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_program_enrolled(p_user_id uuid, p_program_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.program_enrollments WHERE program_id = p_program_id AND user_id = p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_read_program(p_user_id uuid, p_program_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = p_program_id
      AND (
        (p.status = 'published' AND p.is_public)
        OR p.created_by = p_user_id
        OR public.is_program_enrolled(p_user_id, p_program_id)
        OR public.is_super_user(p_user_id)
      )
  );
$$;

CREATE POLICY "programs_select" ON public.programs FOR SELECT
  USING ((status = 'published' AND is_public) OR created_by = auth.uid()
         OR public.is_program_enrolled(auth.uid(), id) OR public.is_super_user(auth.uid()));
CREATE POLICY "programs_insert" ON public.programs FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "programs_update" ON public.programs FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_super_user(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_super_user(auth.uid()));
CREATE POLICY "programs_delete" ON public.programs FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_super_user(auth.uid()));

CREATE TRIGGER programs_set_updated_at BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ WEEKS ============
CREATE TABLE public.program_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, week_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_weeks TO authenticated;
GRANT SELECT ON public.program_weeks TO anon;
GRANT ALL ON public.program_weeks TO service_role;
ALTER TABLE public.program_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "program_weeks_select" ON public.program_weeks FOR SELECT
  USING (public.can_read_program(auth.uid(), program_id));
CREATE POLICY "program_weeks_write" ON public.program_weeks FOR ALL TO authenticated
  USING (public.is_program_owner(auth.uid(), program_id) OR public.is_super_user(auth.uid()))
  WITH CHECK (public.is_program_owner(auth.uid(), program_id) OR public.is_super_user(auth.uid()));

-- ============ DAYS ============
CREATE TABLE public.program_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  week_id uuid NOT NULL REFERENCES public.program_weeks(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  name text,
  is_rest_day boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_id, day_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_days TO authenticated;
GRANT SELECT ON public.program_days TO anon;
GRANT ALL ON public.program_days TO service_role;
ALTER TABLE public.program_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "program_days_select" ON public.program_days FOR SELECT
  USING (public.can_read_program(auth.uid(), program_id));
CREATE POLICY "program_days_write" ON public.program_days FOR ALL TO authenticated
  USING (public.is_program_owner(auth.uid(), program_id) OR public.is_super_user(auth.uid()))
  WITH CHECK (public.is_program_owner(auth.uid(), program_id) OR public.is_super_user(auth.uid()));

-- ============ WORKOUTS ============
CREATE TABLE public.program_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES public.program_days(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  workout_format text NOT NULL DEFAULT 'standard',
  format_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  est_duration_minutes integer,
  display_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_workouts TO authenticated;
GRANT SELECT ON public.program_workouts TO anon;
GRANT ALL ON public.program_workouts TO service_role;
ALTER TABLE public.program_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "program_workouts_select" ON public.program_workouts FOR SELECT
  USING (public.can_read_program(auth.uid(), program_id));
CREATE POLICY "program_workouts_write" ON public.program_workouts FOR ALL TO authenticated
  USING (public.is_program_owner(auth.uid(), program_id) OR public.is_super_user(auth.uid()))
  WITH CHECK (public.is_program_owner(auth.uid(), program_id) OR public.is_super_user(auth.uid()));

-- ============ SECTIONS ============
CREATE TABLE public.workout_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  workout_id uuid NOT NULL REFERENCES public.program_workouts(id) ON DELETE CASCADE,
  name text NOT NULL,
  section_type text NOT NULL DEFAULT 'strength',
  workout_format text,
  format_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sections TO authenticated;
GRANT SELECT ON public.workout_sections TO anon;
GRANT ALL ON public.workout_sections TO service_role;
ALTER TABLE public.workout_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workout_sections_select" ON public.workout_sections FOR SELECT
  USING (public.can_read_program(auth.uid(), program_id));
CREATE POLICY "workout_sections_write" ON public.workout_sections FOR ALL TO authenticated
  USING (public.is_program_owner(auth.uid(), program_id) OR public.is_super_user(auth.uid()))
  WITH CHECK (public.is_program_owner(auth.uid(), program_id) OR public.is_super_user(auth.uid()));

-- ============ EXERCISES ============
CREATE TABLE public.section_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.workout_sections(id) ON DELETE CASCADE,
  movement_id uuid REFERENCES public.movements(id) ON DELETE SET NULL,
  movement_name text NOT NULL,
  sets integer,
  reps integer,
  reps_scheme text,
  duration_seconds integer,
  distance numeric,
  distance_unit text,
  load numeric,
  load_unit text DEFAULT 'kg',
  load_percent numeric,
  tempo text,
  rest_seconds integer,
  notes text,
  video_url text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.section_exercises TO authenticated;
GRANT SELECT ON public.section_exercises TO anon;
GRANT ALL ON public.section_exercises TO service_role;
ALTER TABLE public.section_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "section_exercises_select" ON public.section_exercises FOR SELECT
  USING (public.can_read_program(auth.uid(), program_id));
CREATE POLICY "section_exercises_write" ON public.section_exercises FOR ALL TO authenticated
  USING (public.is_program_owner(auth.uid(), program_id) OR public.is_super_user(auth.uid()))
  WITH CHECK (public.is_program_owner(auth.uid(), program_id) OR public.is_super_user(auth.uid()));

-- ============ ENROLLMENTS ============
CREATE POLICY "enrollments_select" ON public.program_enrollments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_program_owner(auth.uid(), program_id) OR public.is_super_user(auth.uid()));
CREATE POLICY "enrollments_insert" ON public.program_enrollments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_program_owner(auth.uid(), program_id) OR public.is_super_user(auth.uid()));
CREATE POLICY "enrollments_update" ON public.program_enrollments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_program_owner(auth.uid(), program_id) OR public.is_super_user(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_program_owner(auth.uid(), program_id) OR public.is_super_user(auth.uid()));
CREATE POLICY "enrollments_delete" ON public.program_enrollments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_program_owner(auth.uid(), program_id) OR public.is_super_user(auth.uid()));

CREATE TRIGGER enrollments_set_updated_at BEFORE UPDATE ON public.program_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SESSIONS (execution records) ============
CREATE TABLE public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  enrollment_id uuid REFERENCES public.program_enrollments(id) ON DELETE SET NULL,
  workout_id uuid REFERENCES public.program_workouts(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  scheduled_date date,
  started_at timestamptz,
  finished_at timestamptz,
  duration_seconds integer,
  rating integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_select" ON public.workout_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR (program_id IS NOT NULL AND public.is_program_owner(auth.uid(), program_id))
         OR public.is_super_user(auth.uid()));
CREATE POLICY "sessions_insert" ON public.workout_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "sessions_update" ON public.workout_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "sessions_delete" ON public.workout_sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_super_user(auth.uid()));

CREATE TRIGGER sessions_set_updated_at BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_session_visible(p_user_id uuid, p_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workout_sessions s
    WHERE s.id = p_session_id
      AND (s.user_id = p_user_id
           OR (s.program_id IS NOT NULL AND public.is_program_owner(p_user_id, s.program_id))
           OR public.is_super_user(p_user_id))
  );
$$;

-- ============ EXERCISE RESULTS ============
CREATE TABLE public.exercise_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  exercise_id uuid REFERENCES public.section_exercises(id) ON DELETE SET NULL,
  movement_id uuid REFERENCES public.movements(id) ON DELETE SET NULL,
  movement_name text NOT NULL,
  set_number integer NOT NULL DEFAULT 1,
  reps integer,
  load numeric,
  load_unit text DEFAULT 'kg',
  time_seconds integer,
  distance numeric,
  distance_unit text,
  rpe numeric,
  completed boolean NOT NULL DEFAULT true,
  skipped boolean NOT NULL DEFAULT false,
  notes text,
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_results TO authenticated;
GRANT ALL ON public.exercise_results TO service_role;
ALTER TABLE public.exercise_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results_select" ON public.exercise_results FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_session_visible(auth.uid(), session_id));
CREATE POLICY "results_insert" ON public.exercise_results FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "results_update" ON public.exercise_results FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "results_delete" ON public.exercise_results FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_super_user(auth.uid()));

CREATE INDEX idx_program_weeks_program ON public.program_weeks(program_id);
CREATE INDEX idx_program_days_week ON public.program_days(week_id);
CREATE INDEX idx_program_workouts_day ON public.program_workouts(day_id);
CREATE INDEX idx_workout_sections_workout ON public.workout_sections(workout_id);
CREATE INDEX idx_section_exercises_section ON public.section_exercises(section_id);
CREATE INDEX idx_enrollments_user ON public.program_enrollments(user_id);
CREATE INDEX idx_sessions_user ON public.workout_sessions(user_id, created_at DESC);
CREATE INDEX idx_results_session ON public.exercise_results(session_id);
CREATE INDEX idx_results_user_movement ON public.exercise_results(user_id, movement_name, performed_at DESC);