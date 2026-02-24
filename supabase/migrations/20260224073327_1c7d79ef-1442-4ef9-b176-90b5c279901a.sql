
-- Part 1D: Override has_competition_access for V1 (bypass subscription check)
CREATE OR REPLACE FUNCTION public.has_competition_access(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT true;
$$;
