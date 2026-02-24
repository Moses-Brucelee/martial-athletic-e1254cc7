
-- ============================================================
-- Normalized Members + Discount Engine
-- 4 tables, 2 security definer functions, RLS, indexes
-- ============================================================

-- 1. GYMS
CREATE TABLE public.gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

-- 2. GYM_MEMBERS
CREATE TABLE public.gym_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  belt_rank TEXT,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active',
  team_assignment TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(gym_id, user_id)
);

ALTER TABLE public.gym_members ENABLE ROW LEVEL SECURITY;

-- 3. MEMBER_DISCOUNTS
CREATE TABLE public.member_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_member_id UUID NOT NULL REFERENCES public.gym_members(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  discount_percentage NUMERIC,
  discount_amount NUMERIC,
  is_stackable BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 100,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  CHECK (
    (discount_percentage IS NOT NULL AND discount_amount IS NULL)
    OR
    (discount_percentage IS NULL AND discount_amount IS NOT NULL)
  )
);

ALTER TABLE public.member_discounts ENABLE ROW LEVEL SECURITY;

-- 4. GYM_DEFAULT_DISCOUNTS
CREATE TABLE public.gym_default_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL,
  discount_percentage NUMERIC NOT NULL,
  applies_to TEXT NOT NULL DEFAULT 'all',
  is_stackable BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 200,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gym_default_discounts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECURITY DEFINER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_gym_owner(p_user_id UUID, p_gym_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gyms WHERE id = p_gym_id AND owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_gym_member_owner(p_user_id UUID, p_gym_member_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gym_members gm
    JOIN public.gyms g ON g.id = gm.gym_id
    WHERE gm.id = p_gym_member_id AND g.owner_id = p_user_id
  );
$$;

-- ============================================================
-- RLS POLICIES — GYMS
-- ============================================================

CREATE POLICY "gyms_select" ON public.gyms
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "gyms_insert" ON public.gyms
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "gyms_update" ON public.gyms
  FOR UPDATE TO authenticated
  USING (
    owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_super_user(auth.uid())
  );

CREATE POLICY "gyms_delete" ON public.gyms
  FOR DELETE TO authenticated
  USING (
    owner_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_super_user(auth.uid())
  );

-- ============================================================
-- RLS POLICIES — GYM_MEMBERS
-- ============================================================

CREATE POLICY "gym_members_select" ON public.gym_members
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_gym_owner((SELECT id FROM public.profiles WHERE user_id = auth.uid()), gym_id)
    OR public.is_super_user(auth.uid())
  );

CREATE POLICY "gym_members_insert" ON public.gym_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_gym_owner((SELECT id FROM public.profiles WHERE user_id = auth.uid()), gym_id)
    OR public.is_super_user(auth.uid())
  );

CREATE POLICY "gym_members_update" ON public.gym_members
  FOR UPDATE TO authenticated
  USING (
    public.is_gym_owner((SELECT id FROM public.profiles WHERE user_id = auth.uid()), gym_id)
    OR public.is_super_user(auth.uid())
  );

CREATE POLICY "gym_members_delete" ON public.gym_members
  FOR DELETE TO authenticated
  USING (
    public.is_gym_owner((SELECT id FROM public.profiles WHERE user_id = auth.uid()), gym_id)
    OR public.is_super_user(auth.uid())
  );

-- ============================================================
-- RLS POLICIES — MEMBER_DISCOUNTS
-- ============================================================

CREATE POLICY "member_discounts_select" ON public.member_discounts
  FOR SELECT TO authenticated
  USING (
    public.is_gym_member_owner((SELECT id FROM public.profiles WHERE user_id = auth.uid()), gym_member_id)
    OR EXISTS (
      SELECT 1 FROM public.gym_members gm
      WHERE gm.id = member_discounts.gym_member_id
      AND gm.user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
    OR public.is_super_user(auth.uid())
  );

CREATE POLICY "member_discounts_insert" ON public.member_discounts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_gym_member_owner((SELECT id FROM public.profiles WHERE user_id = auth.uid()), gym_member_id)
    OR public.is_super_user(auth.uid())
  );

CREATE POLICY "member_discounts_update" ON public.member_discounts
  FOR UPDATE TO authenticated
  USING (
    public.is_gym_member_owner((SELECT id FROM public.profiles WHERE user_id = auth.uid()), gym_member_id)
    OR public.is_super_user(auth.uid())
  );

CREATE POLICY "member_discounts_delete" ON public.member_discounts
  FOR DELETE TO authenticated
  USING (
    public.is_gym_member_owner((SELECT id FROM public.profiles WHERE user_id = auth.uid()), gym_member_id)
    OR public.is_super_user(auth.uid())
  );

-- ============================================================
-- RLS POLICIES — GYM_DEFAULT_DISCOUNTS
-- ============================================================

CREATE POLICY "gym_default_discounts_select" ON public.gym_default_discounts
  FOR SELECT TO authenticated
  USING (
    public.is_gym_owner((SELECT id FROM public.profiles WHERE user_id = auth.uid()), gym_id)
    OR public.is_super_user(auth.uid())
  );

CREATE POLICY "gym_default_discounts_insert" ON public.gym_default_discounts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_gym_owner((SELECT id FROM public.profiles WHERE user_id = auth.uid()), gym_id)
    OR public.is_super_user(auth.uid())
  );

CREATE POLICY "gym_default_discounts_update" ON public.gym_default_discounts
  FOR UPDATE TO authenticated
  USING (
    public.is_gym_owner((SELECT id FROM public.profiles WHERE user_id = auth.uid()), gym_id)
    OR public.is_super_user(auth.uid())
  );

CREATE POLICY "gym_default_discounts_delete" ON public.gym_default_discounts
  FOR DELETE TO authenticated
  USING (
    public.is_gym_owner((SELECT id FROM public.profiles WHERE user_id = auth.uid()), gym_id)
    OR public.is_super_user(auth.uid())
  );

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_gym_members_gym_id ON public.gym_members(gym_id);
CREATE INDEX idx_gym_members_user_id ON public.gym_members(user_id);
CREATE INDEX idx_member_discounts_member_id ON public.member_discounts(gym_member_id);
CREATE INDEX idx_gym_default_discounts_gym_id ON public.gym_default_discounts(gym_id);
