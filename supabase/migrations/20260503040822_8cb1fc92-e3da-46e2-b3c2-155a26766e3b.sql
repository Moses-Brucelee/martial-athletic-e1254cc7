
CREATE OR REPLACE FUNCTION public.admin_get_user_emails(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_user(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT u.id, u.email::text
    FROM auth.users u
    WHERE u.id = ANY(p_user_ids);
END;
$$;
