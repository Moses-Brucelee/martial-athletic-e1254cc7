ALTER TABLE public.heat_schedule
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 10;

UPDATE public.heat_schedule h
SET duration_minutes = GREATEST(1, LEAST(240, CEIL(w.time_cap_seconds::numeric / 60)::int))
FROM public.competition_workouts w
WHERE h.workout_id = w.id
  AND w.time_cap_seconds IS NOT NULL
  AND w.time_cap_seconds > 0;

ALTER TABLE public.heat_schedule
  ADD CONSTRAINT heat_schedule_duration_positive CHECK (duration_minutes > 0 AND duration_minutes <= 1440);