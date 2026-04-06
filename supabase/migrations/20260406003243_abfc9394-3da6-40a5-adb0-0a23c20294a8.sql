-- Add visibility columns to competition_workouts
ALTER TABLE public.competition_workouts
  ADD COLUMN visibility text NOT NULL DEFAULT 'visible',
  ADD COLUMN scheduled_reveal_at timestamp with time zone DEFAULT NULL;

-- Drop and recreate the SELECT policy to enforce visibility for non-owners
DROP POLICY IF EXISTS "Authenticated users can view workouts" ON public.competition_workouts;

CREATE POLICY "Authenticated users can view workouts"
ON public.competition_workouts
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    -- Owners and super users see everything
    is_competition_owner(auth.uid(), competition_id)
    OR is_super_user(auth.uid())
    -- Judges see everything for their competition
    OR is_competition_judge(auth.uid(), competition_id)
    -- Everyone else only sees visible or revealed workouts
    OR visibility = 'visible'
    OR (visibility = 'scheduled' AND scheduled_reveal_at IS NOT NULL AND now() >= scheduled_reveal_at)
  )
);