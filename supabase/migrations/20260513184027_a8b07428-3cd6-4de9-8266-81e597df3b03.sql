
CREATE TABLE public.competition_sponsors_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  website_url text,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sponsors_meta_competition ON public.competition_sponsors_meta(competition_id);

ALTER TABLE public.competition_sponsors_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors meta public read"
  ON public.competition_sponsors_meta FOR SELECT
  USING (true);

CREATE POLICY "Owners insert sponsors meta"
  ON public.competition_sponsors_meta FOR INSERT
  WITH CHECK (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));

CREATE POLICY "Owners update sponsors meta"
  ON public.competition_sponsors_meta FOR UPDATE
  USING (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));

CREATE POLICY "Owners delete sponsors meta"
  ON public.competition_sponsors_meta FOR DELETE
  USING (public.is_competition_owner(auth.uid(), competition_id) OR public.is_super_user(auth.uid()));

CREATE TRIGGER trg_sponsors_meta_updated
  BEFORE UPDATE ON public.competition_sponsors_meta
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.increment_sponsor_click(
  p_competition_id uuid,
  p_storage_path text,
  p_website_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.competition_sponsors_meta (competition_id, storage_path, website_url, click_count)
  VALUES (p_competition_id, p_storage_path, p_website_url, 1)
  ON CONFLICT (storage_path) DO UPDATE
    SET click_count = public.competition_sponsors_meta.click_count + 1,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_sponsor_click(uuid, text, text) TO anon, authenticated;
