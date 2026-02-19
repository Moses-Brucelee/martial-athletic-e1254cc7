
-- Table for storing individual team scores per workout
CREATE TABLE public.competition_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.competition_teams(id) ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES public.competition_workouts(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, workout_id)
);

-- Enable RLS
ALTER TABLE public.competition_scores ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view scores
CREATE POLICY "Authenticated users can view scores"
  ON public.competition_scores FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only competition owner can insert scores
CREATE POLICY "Competition owner can insert scores"
  ON public.competition_scores FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM competitions
    WHERE competitions.id = competition_scores.competition_id
    AND competitions.created_by = auth.uid()
  ));

-- Only competition owner can update scores
CREATE POLICY "Competition owner can update scores"
  ON public.competition_scores FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM competitions
    WHERE competitions.id = competition_scores.competition_id
    AND competitions.created_by = auth.uid()
  ));

-- Only competition owner can delete scores
CREATE POLICY "Competition owner can delete scores"
  ON public.competition_scores FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM competitions
    WHERE competitions.id = competition_scores.competition_id
    AND competitions.created_by = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_competition_scores_updated_at
  BEFORE UPDATE ON public.competition_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_scores;
