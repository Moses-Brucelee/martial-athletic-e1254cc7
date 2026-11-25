CREATE TABLE public.shop_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL UNIQUE,
  shop_name text NOT NULL,
  category text,
  website_url text,
  logo_url text,
  banner_url text,
  bio text,
  featured_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  available_for_sponsorship boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_name_len CHECK (char_length(shop_name) BETWEEN 2 AND 80),
  CONSTRAINT shop_bio_len CHECK (bio IS NULL OR char_length(bio) <= 600)
);
GRANT SELECT ON public.shop_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_profiles TO authenticated;
GRANT ALL ON public.shop_profiles TO service_role;
ALTER TABLE public.shop_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view shops" ON public.shop_profiles FOR SELECT USING (true);
CREATE POLICY "Owner creates own shop" ON public.shop_profiles FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Owner or super user updates shop" ON public.shop_profiles FOR UPDATE TO authenticated USING (owner_user_id = auth.uid() OR public.is_super_user(auth.uid())) WITH CHECK (owner_user_id = auth.uid() OR public.is_super_user(auth.uid()));
CREATE POLICY "Owner or super user deletes shop" ON public.shop_profiles FOR DELETE TO authenticated USING (owner_user_id = auth.uid() OR public.is_super_user(auth.uid()));
CREATE TRIGGER trg_shop_profiles_updated BEFORE UPDATE ON public.shop_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.competition_sponsors_meta ADD COLUMN shop_id uuid REFERENCES public.shop_profiles(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX competition_sponsors_meta_comp_shop_uq ON public.competition_sponsors_meta(competition_id, shop_id) WHERE shop_id IS NOT NULL;