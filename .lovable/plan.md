

# Normalized Members + Discount Engine — Refined Implementation Plan

## User Refinements Incorporated

All 5 critical refinements from the user are accepted and integrated:

- A. `gyms.owner_id` as real FK to `profiles(id)` with ON DELETE CASCADE
- B. `slug TEXT UNIQUE NOT NULL` on gyms for future public pages
- C. CHECK constraint on `member_discounts` ensuring exactly one of percentage/amount
- D. `created_by UUID REFERENCES profiles(id)` on `member_discounts` for audit
- E. Performance indexes on all high-query columns

Additionally: compound discount stacking (`1 - product of (1 - each%)`) instead of linear sum.

---

## Phase 1: Database Migration

Single migration creating 4 tables, 2 security definer functions, RLS policies, and indexes.

### Tables

**gyms**

| Column | Type | Constraint |
|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() |
| owner_id | UUID NOT NULL | REFERENCES profiles(id) ON DELETE CASCADE |
| name | TEXT NOT NULL | |
| slug | TEXT UNIQUE NOT NULL | For future /gym/:slug |
| description | TEXT NULL | |
| logo_url | TEXT NULL | |
| website_url | TEXT NULL | |
| metadata | JSONB NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**gym_members**

| Column | Type | Constraint |
|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() |
| gym_id | UUID NOT NULL | REFERENCES gyms(id) ON DELETE CASCADE |
| user_id | UUID NOT NULL | REFERENCES profiles(id) ON DELETE CASCADE |
| role | TEXT | DEFAULT 'member' |
| belt_rank | TEXT NULL | |
| join_date | DATE | DEFAULT CURRENT_DATE |
| status | TEXT | DEFAULT 'active' |
| team_assignment | TEXT NULL | |
| metadata | JSONB NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| | | UNIQUE(gym_id, user_id) |

Zero identity fields -- name/email come from profiles via join.

**member_discounts**

| Column | Type | Constraint |
|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() |
| gym_member_id | UUID NOT NULL | REFERENCES gym_members(id) ON DELETE CASCADE |
| discount_type | TEXT NOT NULL | subscription, competition_entry, vendor, promotional, reward, manual_override |
| source_type | TEXT NOT NULL | gym_subscription, affiliation, vendor, tournament_result, admin, system |
| source_id | UUID NULL | Reference to affiliation/vendor/competition |
| discount_percentage | NUMERIC NULL | |
| discount_amount | NUMERIC NULL | |
| is_stackable | BOOLEAN | DEFAULT false |
| priority | INTEGER | DEFAULT 100 |
| valid_from | TIMESTAMPTZ | DEFAULT now() |
| valid_until | TIMESTAMPTZ NULL | |
| metadata | JSONB NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| created_by | UUID NULL | REFERENCES profiles(id) |
| | | CHECK: exactly one of percentage or amount must be non-null |

**gym_default_discounts**

| Column | Type | Constraint |
|---|---|---|
| id | UUID PK | DEFAULT gen_random_uuid() |
| gym_id | UUID NOT NULL | REFERENCES gyms(id) ON DELETE CASCADE |
| discount_type | TEXT NOT NULL | |
| discount_percentage | NUMERIC NOT NULL | |
| applies_to | TEXT | DEFAULT 'all' |
| is_stackable | BOOLEAN | DEFAULT false |
| priority | INTEGER | DEFAULT 200 |
| valid_from | TIMESTAMPTZ | DEFAULT now() |
| valid_until | TIMESTAMPTZ NULL | |
| metadata | JSONB NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### Security Definer Functions

```text
is_gym_owner(p_user_id UUID, p_gym_id UUID) -> BOOLEAN
  SELECT EXISTS (SELECT 1 FROM gyms WHERE id = p_gym_id AND owner_id = p_user_id)

is_gym_member_owner(p_user_id UUID, p_gym_member_id UUID) -> BOOLEAN
  SELECT EXISTS (
    SELECT 1 FROM gym_members gm
    JOIN gyms g ON g.id = gm.gym_id
    WHERE gm.id = p_gym_member_id AND g.owner_id = p_user_id
  )
```

### RLS Policies

**gyms:** All authenticated can SELECT. Owner can INSERT/UPDATE/DELETE. Super users bypass.

**gym_members:** Gym owner (via is_gym_owner) or own record (user_id = auth.uid()) can SELECT. Gym owner can INSERT/UPDATE/DELETE. Super users bypass.

**member_discounts:** Gym owner of parent member (via is_gym_member_owner) or own membership can SELECT. Gym owner can INSERT/UPDATE/DELETE. Super users bypass.

**gym_default_discounts:** Gym owner (via is_gym_owner) can full CRUD. Super users bypass.

### Indexes

```text
idx_gym_members_gym_id ON gym_members(gym_id)
idx_gym_members_user_id ON gym_members(user_id)
idx_member_discounts_member_id ON member_discounts(gym_member_id)
idx_gym_default_discounts_gym_id ON gym_default_discounts(gym_id)
```

---

## Phase 2: Discount Resolution Engine

### New file: `src/utils/discountResolver.types.ts`

Type definitions for `DiscountContext`, `MemberDiscount`, `GymDefaultDiscount`, `AppliedDiscount`, `ResolvedDiscount`.

### New file: `src/utils/discountResolver.ts`

Pure stateless function -- no database calls, no React:

```text
resolveMemberDiscount(
  memberDiscounts: MemberDiscount[],
  gymDefaults: GymDefaultDiscount[],
  context: DiscountContext,
  now?: Date
) => ResolvedDiscount
```

**Key logic change per user feedback:** Compound stacking, not linear.

- 20% + 20% = 1 - (0.8 x 0.8) = 36%, NOT 40%
- Capped at 100%
- Non-stackable: highest priority only
- Fixed amounts: summed separately

---

## Phase 3: Members Module

### New file: `src/modules/members/types.ts`

TypeScript interfaces. `GymMember` type includes profile fields (display_name, avatar_url, full_name) fetched via join -- never stored in gym_members.

### New file: `src/modules/members/api.ts`

Supabase query functions:
- `fetchUserGyms(userId)` -- gyms owned by user
- `createGym(data)` -- with auto-generated slug from name
- `fetchGymMembers(gymId)` -- joined with profiles for display data
- `addGymMember(gymId, userId)` -- insert membership
- `removeGymMember(memberId)` -- delete
- `updateGymMember(memberId, updates)` -- belt_rank, status, role, etc.
- `fetchMemberDiscounts(gymMemberId)` -- active discounts
- `createMemberDiscount(data)` -- with created_by from auth
- `deleteMemberDiscount(id)` -- remove
- `fetchGymDefaultDiscounts(gymId)` -- gym-level defaults
- `createGymDefaultDiscount(data)` -- insert
- `deleteGymDefaultDiscount(id)` -- remove

### New file: `src/modules/members/hooks.ts`

TanStack Query hooks wrapping each API function plus `useResolvedDiscount(gymMemberId, context)` that fetches discounts + defaults and runs the resolver.

---

## Phase 4: UI Components

### New file: `src/modules/members/components/MembersPage.tsx`

- If user has no gym: "Create Your Gym" form (name, description -- slug auto-generated)
- Once gym exists: searchable member directory with profile avatars, display names, belt ranks, status
- Add member by searching existing profiles
- Click to open member detail

### New file: `src/modules/members/components/MemberDetailSheet.tsx`

Side sheet showing:
- Profile info (from profiles table via join)
- Membership details (belt rank, role, status, team)
- Discounts section: active/expired, type, source, percentage/amount, stackable badge, priority, expiration
- Computed discount preview per context
- "Add Discount" button for gym owner

### New file: `src/modules/members/components/AddDiscountDialog.tsx`

Form with discount type, source type, percentage OR amount (mutually exclusive), expiration picker, priority, stackable toggle.

### Update: `src/App.tsx`

Add `/members` route wrapped in `ProtectedRoute`.

---

## File Summary

| File | Action |
|---|---|
| Database migration | CREATE: 4 tables, 2 functions, RLS, indexes |
| `src/utils/discountResolver.types.ts` | CREATE |
| `src/utils/discountResolver.ts` | CREATE |
| `src/modules/members/types.ts` | CREATE |
| `src/modules/members/api.ts` | CREATE |
| `src/modules/members/hooks.ts` | CREATE |
| `src/modules/members/components/MembersPage.tsx` | CREATE |
| `src/modules/members/components/MemberDetailSheet.tsx` | CREATE |
| `src/modules/members/components/AddDiscountDialog.tsx` | CREATE |
| `src/App.tsx` | UPDATE: add /members route |

## Execution Order

1. Database migration (tables, functions, RLS, indexes)
2. `discountResolver.types.ts` + `discountResolver.ts`
3. `members/types.ts`
4. `members/api.ts`
5. `members/hooks.ts`
6. `MembersPage.tsx`, `MemberDetailSheet.tsx`, `AddDiscountDialog.tsx`
7. Update `App.tsx`
8. Test end-to-end

