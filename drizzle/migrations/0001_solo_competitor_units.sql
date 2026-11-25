CREATE OR REPLACE FUNCTION public.ensure_solo_competitor_unit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_size int;
  v_div_name text;
  v_team_id uuid;
BEGIN
  IF NEW.division_id IS NULL OR NEW.status IN ('rejected','withdrawn','cancelled') THEN
    RETURN NEW;
  END IF;
  SELECT team_size, name INTO v_size, v_div_name FROM public.competition_divisions WHERE id = NEW.division_id;
  IF COALESCE(v_size, 1) <> 1 THEN
    RETURN NEW;
  END IF;
  IF NEW.team_id IS NOT NULL THEN
    UPDATE public.competition_teams
      SET team_name = NEW.athlete_name, division_id = NEW.division_id, division = v_div_name
      WHERE id = NEW.team_id
        AND (team_name IS DISTINCT FROM NEW.athlete_name OR division_id IS DISTINCT FROM NEW.division_id);
    RETURN NEW;
  END IF;
  INSERT INTO public.competition_teams (competition_id, team_name, division_id, division, captain_user_id, is_complete)
  VALUES (NEW.competition_id, NEW.athlete_name, NEW.division_id, v_div_name, NEW.user_id, true)
  RETURNING id INTO v_team_id;
  NEW.team_id := v_team_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_solo_competitor_unit ON public.athlete_registrations;
CREATE TRIGGER trg_ensure_solo_competitor_unit
BEFORE INSERT OR UPDATE OF athlete_name, division_id, status, team_id ON public.athlete_registrations
FOR EACH ROW EXECUTE FUNCTION public.ensure_solo_competitor_unit();

-- Backfill: touching rows fires the trigger
UPDATE public.athlete_registrations r
SET status = r.status
FROM public.competition_divisions d
WHERE d.id = r.division_id AND d.team_size = 1 AND r.team_id IS NULL;