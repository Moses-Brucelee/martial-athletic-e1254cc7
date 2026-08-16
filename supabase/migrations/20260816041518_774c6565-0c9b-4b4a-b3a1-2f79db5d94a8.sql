-- Marketplace listings for apparel & equipment
CREATE TABLE public.marketplace_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('apparel','equipment')),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'ZAR',
  image_url TEXT,
  external_url TEXT,
  vendor_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_synthetic BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketplace_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_items TO authenticated;
GRANT ALL ON public.marketplace_items TO service_role;

ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active marketplace items"
  ON public.marketplace_items FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super users manage marketplace items"
  ON public.marketplace_items FOR ALL
  TO authenticated
  USING (public.is_super_user(auth.uid()))
  WITH CHECK (public.is_super_user(auth.uid()));

CREATE TRIGGER update_marketplace_items_updated_at
  BEFORE UPDATE ON public.marketplace_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Flag for easy cleanup of sample programs
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS is_synthetic BOOLEAN NOT NULL DEFAULT false;