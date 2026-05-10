
-- 1. Add tier columns to profiles (acting as the users table)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier_slug text NOT NULL DEFAULT 'free'
    REFERENCES public.pricing_tiers(key),
  ADD COLUMN IF NOT EXISTS tier_assigned_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS tier_assigned_by uuid REFERENCES auth.users(id);

-- 2. Backfill (default already 'free', but ensure)
UPDATE public.profiles SET tier_slug = 'free' WHERE tier_slug IS NULL;

-- 3. tier_change_log
CREATE TABLE IF NOT EXISTS public.tier_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_tier_slug text,
  new_tier_slug text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  reason text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tier_change_log_user ON public.tier_change_log(user_id, changed_at DESC);

ALTER TABLE public.tier_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super users can view tier change log"
  ON public.tier_change_log FOR SELECT
  TO authenticated
  USING (public.is_super_user(auth.uid()));

-- No INSERT/UPDATE/DELETE policies — only the SECURITY DEFINER trigger writes rows.

-- 4. Trigger to log tier changes
CREATE OR REPLACE FUNCTION public.log_tier_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.tier_slug IS DISTINCT FROM OLD.tier_slug THEN
    INSERT INTO public.tier_change_log (user_id, old_tier_slug, new_tier_slug, changed_by)
    VALUES (NEW.user_id, OLD.tier_slug, NEW.tier_slug, auth.uid());
    NEW.tier_assigned_at := now();
    NEW.tier_assigned_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_log_tier_change ON public.profiles;
CREATE TRIGGER trg_profiles_log_tier_change
  BEFORE UPDATE OF tier_slug ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_tier_change();

-- 5. Helper: current user's tier sort_order >= min_tier sort_order
CREATE OR REPLACE FUNCTION public.user_tier_at_least(min_tier text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT pt_user.sort_order >= pt_min.sort_order
       FROM public.profiles p
       JOIN public.pricing_tiers pt_user ON pt_user.key = p.tier_slug
       JOIN public.pricing_tiers pt_min  ON pt_min.key = min_tier
      WHERE p.user_id = auth.uid()
      LIMIT 1),
    false
  );
$$;
