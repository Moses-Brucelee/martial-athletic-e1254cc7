DELETE FROM public.super_users WHERE user_id = '453cd23a-49a3-40ac-bd2f-6975c6d7a48f';
INSERT INTO public.super_users (user_id) VALUES ('23b2f35c-9108-4cb8-8464-62eb96dfa6b6') ON CONFLICT DO NOTHING;