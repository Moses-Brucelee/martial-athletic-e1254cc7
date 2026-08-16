GRANT EXECUTE ON FUNCTION public.is_super_user(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_competition_owner(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_competition_judge(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.has_competition_access(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_gym_owner(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_sponsor_click(uuid, text, text) TO anon;