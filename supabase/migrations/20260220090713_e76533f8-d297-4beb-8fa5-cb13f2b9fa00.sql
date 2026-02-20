
-- ============================================================
-- PHASE 1: Enterprise Competition Platform V2 — Database Foundation
-- ============================================================

-- 1. NEW TABLES

CREATE TABLE public.super_users (
  user_id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.super_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.competition_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competition_id, name)
);
ALTER TABLE public.competition_divisions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.competition_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.competition_teams(id) ON DELETE CASCADE,
  user_id UUID,
  athlete_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id),
  UNIQUE (competition_id, team_id, athlete_name)
);
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.competition_judges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id)
);
ALTER TABLE public.competition_judges ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.scoring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID,
  team_id UUID,
  judge_id UUID,
  score_id UUID,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scoring_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, year)
);
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.season_competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  UNIQUE (season_id, competition_id)
);
ALTER TABLE public.season_competitions ENABLE ROW LEVEL SECURITY;

-- 2. ALTER EXISTING TABLES

ALTER TABLE public.competition_teams
ADD COLUMN division_id UUID REFERENCES public.competition_divisions(id) ON DELETE SET NULL;

ALTER TABLE public.competition_scores
ADD COLUMN judge_id UUID,
ADD COLUMN locked BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN locked_at TIMESTAMPTZ;

ALTER TABLE public.competition_workouts
ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.competitions
ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL;

-- 3. INDEXES

CREATE INDEX idx_comp_divisions_competition ON public.competition_divisions (competition_id);
CREATE INDEX idx_comp_participants_comp_team ON public.competition_participants (competition_id, team_id);
CREATE INDEX idx_comp_judges_comp_user ON public.competition_judges (competition_id, user_id);
CREATE INDEX idx_scoring_events_comp_team ON public.scoring_events (competition_id, team_id);
CREATE INDEX idx_comp_scores_comp_team ON public.competition_scores (competition_id, team_id);
CREATE INDEX idx_comp_teams_comp_div ON public.competition_teams (competition_id, division_id);
CREATE INDEX idx_competitions_season ON public.competitions (season_id);

-- 4. FUNCTIONS + TRIGGERS

CREATE OR REPLACE FUNCTION public.limit_super_users()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.super_users) >= 2 THEN
    RAISE EXCEPTION 'Maximum of 2 super users allowed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_super_user_limit
BEFORE INSERT ON public.super_users
FOR EACH ROW EXECUTE FUNCTION public.limit_super_users();

CREATE OR REPLACE FUNCTION public.is_super_user(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_users WHERE user_id = p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_competition_owner(p_user_id UUID, p_competition_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.competitions WHERE id = p_competition_id AND created_by = p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_competition_judge(p_user_id UUID, p_competition_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.competition_judges WHERE competition_id = p_competition_id AND user_id = p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.log_score_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.scoring_events (competition_id, team_id, judge_id, score_id, event_type, payload)
  VALUES (NEW.competition_id, NEW.team_id, NEW.judge_id, NEW.id, TG_OP, row_to_json(NEW));
  RETURN NEW;
END;
$$;

CREATE TRIGGER score_audit_trigger
AFTER INSERT OR UPDATE ON public.competition_scores
FOR EACH ROW EXECUTE FUNCTION public.log_score_event();

-- 5. RPC LEADERBOARD FUNCTIONS

CREATE OR REPLACE FUNCTION public.get_competition_leaderboard(p_competition_id UUID)
RETURNS TABLE (division_id UUID, division_name TEXT, team_id UUID, team_name TEXT, total_points NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, d.name, t.id, t.team_name, COALESCE(SUM(s.score), 0)
  FROM public.competition_teams t
  LEFT JOIN public.competition_divisions d ON d.id = t.division_id
  LEFT JOIN public.competition_scores s ON s.team_id = t.id AND s.competition_id = p_competition_id
  WHERE t.competition_id = p_competition_id
  GROUP BY d.id, d.name, d.sort_order, t.id, t.team_name
  ORDER BY COALESCE(d.sort_order, 999999) ASC, COALESCE(SUM(s.score), 0) DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_season_leaderboard(p_season_id UUID)
RETURNS TABLE (team_id UUID, team_name TEXT, total_points NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.team_name, COALESCE(SUM(s.score), 0)
  FROM public.season_competitions sc
  JOIN public.competition_scores s ON s.competition_id = sc.competition_id
  JOIN public.competition_teams t ON t.id = s.team_id
  WHERE sc.season_id = p_season_id
  GROUP BY t.id, t.team_name
  ORDER BY COALESCE(SUM(s.score), 0) DESC;
$$;

-- 6. RLS POLICIES

CREATE POLICY "super_users_select" ON public.super_users FOR SELECT TO authenticated USING (true);

CREATE POLICY "divisions_select" ON public.competition_divisions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "divisions_insert" ON public.competition_divisions FOR INSERT TO authenticated WITH CHECK (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));
CREATE POLICY "divisions_update" ON public.competition_divisions FOR UPDATE TO authenticated USING (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));
CREATE POLICY "divisions_delete" ON public.competition_divisions FOR DELETE TO authenticated USING (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));

CREATE POLICY "participants_select" ON public.competition_participants FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "participants_insert" ON public.competition_participants FOR INSERT TO authenticated WITH CHECK (public.is_competition_owner(auth.uid(), competition_id) OR (user_id = auth.uid()) OR public.is_super_user(auth.uid()));
CREATE POLICY "participants_update" ON public.competition_participants FOR UPDATE TO authenticated USING (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));
CREATE POLICY "participants_delete" ON public.competition_participants FOR DELETE TO authenticated USING (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));

CREATE POLICY "judges_select" ON public.competition_judges FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "judges_insert" ON public.competition_judges FOR INSERT TO authenticated WITH CHECK (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));
CREATE POLICY "judges_delete" ON public.competition_judges FOR DELETE TO authenticated USING (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));

CREATE POLICY "scoring_events_select" ON public.scoring_events FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "seasons_select" ON public.seasons FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "seasons_insert" ON public.seasons FOR INSERT TO authenticated WITH CHECK (public.is_super_user(auth.uid()));
CREATE POLICY "seasons_update" ON public.seasons FOR UPDATE TO authenticated USING (public.is_super_user(auth.uid()));
CREATE POLICY "seasons_delete" ON public.seasons FOR DELETE TO authenticated USING (public.is_super_user(auth.uid()));

CREATE POLICY "season_comps_select" ON public.season_competitions FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "season_comps_insert" ON public.season_competitions FOR INSERT TO authenticated WITH CHECK (public.is_super_user(auth.uid()));
CREATE POLICY "season_comps_delete" ON public.season_competitions FOR DELETE TO authenticated USING (public.is_super_user(auth.uid()));

-- Replace competition_scores write policies
DROP POLICY IF EXISTS "Competition owner can insert scores" ON public.competition_scores;
DROP POLICY IF EXISTS "Competition owner can update scores" ON public.competition_scores;
DROP POLICY IF EXISTS "Competition owner can delete scores" ON public.competition_scores;

CREATE POLICY "scores_insert" ON public.competition_scores FOR INSERT TO authenticated
  WITH CHECK (public.is_super_user(auth.uid()) OR ((public.is_competition_owner(auth.uid(), competition_id) OR public.is_competition_judge(auth.uid(), competition_id)) AND NOT EXISTS (SELECT 1 FROM public.competition_workouts w WHERE w.id = workout_id AND w.is_locked = true)));

CREATE POLICY "scores_update" ON public.competition_scores FOR UPDATE TO authenticated
  USING (public.is_super_user(auth.uid()) OR ((public.is_competition_owner(auth.uid(), competition_id) OR public.is_competition_judge(auth.uid(), competition_id)) AND locked = false AND NOT EXISTS (SELECT 1 FROM public.competition_workouts w WHERE w.id = workout_id AND w.is_locked = true)));

CREATE POLICY "scores_delete" ON public.competition_scores FOR DELETE TO authenticated
  USING (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));

-- Update competitions policies with super_user override
DROP POLICY IF EXISTS "Users can update their own competitions" ON public.competitions;
DROP POLICY IF EXISTS "Users can delete their own competitions" ON public.competitions;
CREATE POLICY "competitions_update" ON public.competitions FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.is_super_user(auth.uid()));
CREATE POLICY "competitions_delete" ON public.competitions FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.is_super_user(auth.uid()));

-- Update competition_teams policies with super_user override
DROP POLICY IF EXISTS "Competition owner can insert teams" ON public.competition_teams;
DROP POLICY IF EXISTS "Competition owner can update teams" ON public.competition_teams;
DROP POLICY IF EXISTS "Competition owner can delete teams" ON public.competition_teams;
CREATE POLICY "teams_insert" ON public.competition_teams FOR INSERT TO authenticated WITH CHECK (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));
CREATE POLICY "teams_update" ON public.competition_teams FOR UPDATE TO authenticated USING (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));
CREATE POLICY "teams_delete" ON public.competition_teams FOR DELETE TO authenticated USING (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));

-- Update competition_workouts policies with super_user override
DROP POLICY IF EXISTS "Competition owner can insert workouts" ON public.competition_workouts;
DROP POLICY IF EXISTS "Competition owner can update workouts" ON public.competition_workouts;
DROP POLICY IF EXISTS "Competition owner can delete workouts" ON public.competition_workouts;
CREATE POLICY "workouts_insert" ON public.competition_workouts FOR INSERT TO authenticated WITH CHECK (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));
CREATE POLICY "workouts_update" ON public.competition_workouts FOR UPDATE TO authenticated USING (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));
CREATE POLICY "workouts_delete" ON public.competition_workouts FOR DELETE TO authenticated USING (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));

-- 7. REALTIME (competition_scores already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scoring_events;
