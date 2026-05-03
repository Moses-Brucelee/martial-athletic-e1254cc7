
CREATE TABLE IF NOT EXISTS public.ai_poster_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  competition_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_poster_gens_user_time
  ON public.ai_poster_generations (user_id, created_at DESC);

ALTER TABLE public.ai_poster_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own generations"
  ON public.ai_poster_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super users see all generations"
  ON public.ai_poster_generations FOR SELECT
  USING (public.is_super_user(auth.uid()));
