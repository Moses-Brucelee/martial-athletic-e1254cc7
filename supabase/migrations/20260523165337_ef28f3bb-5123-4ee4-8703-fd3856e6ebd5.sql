
-- ─────────────────────────────────────────────────────────────────────
-- 1. competitions: visibility + gym_id
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE public.competitions
    ADD CONSTRAINT competitions_visibility_chk CHECK (visibility IN ('public','private'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_competitions_gym_id ON public.competitions(gym_id);

-- Replace SELECT policy to enforce private visibility
DROP POLICY IF EXISTS "View competitions (public for non-draft)" ON public.competitions;

CREATE POLICY "View competitions"
ON public.competitions FOR SELECT
USING (
  -- Owner / super user always
  (auth.uid() = created_by)
  OR public.is_super_user(auth.uid())
  -- Public competitions: signed-in OR non-draft (guest browse)
  OR (
    visibility = 'public'
    AND ((auth.uid() IS NOT NULL) OR (status <> 'draft'))
  )
  -- Private competitions: judges
  OR public.is_competition_judge(auth.uid(), id)
  -- Private competitions: registered athletes
  OR EXISTS (
    SELECT 1 FROM public.athlete_registrations ar
    WHERE ar.competition_id = competitions.id AND ar.user_id = auth.uid()
  )
  -- Private competitions: members of the linked affiliate gym
  OR (
    visibility = 'private'
    AND gym_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.gym_members gm
      WHERE gm.gym_id = competitions.gym_id
        AND gm.user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        AND gm.status = 'active'
    )
  )
);

-- ─────────────────────────────────────────────────────────────────────
-- 2. competition_judges: nullable user_id + guest display_name
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.competition_judges
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS display_name text;

DO $$ BEGIN
  ALTER TABLE public.competition_judges
    ADD CONSTRAINT competition_judges_identity_chk
    CHECK (user_id IS NOT NULL OR (display_name IS NOT NULL AND length(trim(display_name)) > 0));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────
-- 3. heat_judges join table
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.heat_judges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  heat_id uuid NOT NULL REFERENCES public.heat_schedule(id) ON DELETE CASCADE,
  judge_id uuid NOT NULL REFERENCES public.competition_judges(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (heat_id, judge_id)
);

ALTER TABLE public.heat_judges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "heat_judges_select"
ON public.heat_judges FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "heat_judges_write"
ON public.heat_judges FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.heat_schedule h
    WHERE h.id = heat_judges.heat_id
      AND (public.is_competition_owner(auth.uid(), h.competition_id) OR public.is_super_user(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.heat_schedule h
    WHERE h.id = heat_judges.heat_id
      AND (public.is_competition_owner(auth.uid(), h.competition_id) OR public.is_super_user(auth.uid()))
  )
);

CREATE INDEX IF NOT EXISTS idx_heat_judges_heat ON public.heat_judges(heat_id);
CREATE INDEX IF NOT EXISTS idx_heat_judges_judge ON public.heat_judges(judge_id);

-- ─────────────────────────────────────────────────────────────────────
-- 4. gym_member_invitations
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gym_member_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, email)
);

ALTER TABLE public.gym_member_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_invites_select"
ON public.gym_member_invitations FOR SELECT
TO authenticated
USING (
  public.is_gym_owner((SELECT id FROM public.profiles WHERE user_id = auth.uid()), gym_id)
  OR public.is_super_user(auth.uid())
);

CREATE POLICY "gym_invites_insert"
ON public.gym_member_invitations FOR INSERT
TO authenticated
WITH CHECK (
  (invited_by = auth.uid()) AND (
    public.is_gym_owner((SELECT id FROM public.profiles WHERE user_id = auth.uid()), gym_id)
    OR public.is_super_user(auth.uid())
  )
);

CREATE POLICY "gym_invites_delete"
ON public.gym_member_invitations FOR DELETE
TO authenticated
USING (
  public.is_gym_owner((SELECT id FROM public.profiles WHERE user_id = auth.uid()), gym_id)
  OR public.is_super_user(auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_gym_invites_email ON public.gym_member_invitations(lower(email)) WHERE accepted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Accept invites on signup (extend handle_new_user)
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  RETURNING id INTO v_profile_id;

  -- Auto-accept any open gym invitations for this email
  IF NEW.email IS NOT NULL AND v_profile_id IS NOT NULL THEN
    INSERT INTO public.gym_members (gym_id, user_id, role, status)
    SELECT i.gym_id, v_profile_id, 'member', 'active'
    FROM public.gym_member_invitations i
    WHERE lower(i.email) = lower(NEW.email)
      AND i.accepted_at IS NULL
    ON CONFLICT DO NOTHING;

    UPDATE public.gym_member_invitations
    SET accepted_at = now()
    WHERE lower(email) = lower(NEW.email)
      AND accepted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;
