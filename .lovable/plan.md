

# Dynamic Tier Architecture: Remove All Hardcoded Frontend Data

## Status Check

Everything marked in your instructions for Layers 1-3 and Super User system is **already implemented and verified**:
- `has_competition_access()` function active in DB
- All RLS policies hardened on competitions + child tables
- `SubscriptionGuard` wrapping `/competition/create` and `/competition/:id/workouts`
- `CompetitionDashboard.tsx` using `canAccess('create_competitions')` for `canAdmin`/`canScore`
- `super_users` table with `limit_super_users` trigger (max 2)
- `/super-dashboard` guarded by `SuperUserGuard`

## The Problem

Tournament Pro is `is_active = false` in the database but still renders on the dashboard because tier data is hardcoded:

| File | Hardcoded Data |
|---|---|
| `useSubscription.ts` | `TIER_HIERARCHY`, `FEATURE_ACCESS` map, `Tier` type |
| `MainMenu.tsx` | `FREE_ITEMS`, `AFFILIATE_ITEMS`, `PRO_ITEMS`, tier labels, section names |
| `CompetitionHeader.tsx` | Tier label/color string comparisons |

---

## Step 1: Database Migration -- Two New Tables

**Table: `menu_items`**

Stores all main menu entries linked to a tier and feature key.

```text
Columns:
  id            UUID PK
  tier_key      TEXT NOT NULL
  feature_key   TEXT NOT NULL
  label         TEXT NOT NULL
  icon_name     TEXT NOT NULL  (e.g. 'User', 'Trophy')
  route         TEXT NOT NULL
  description   TEXT (nullable)
  sort_order    INT DEFAULT 0
  is_active     BOOLEAN DEFAULT true
  created_at    TIMESTAMPTZ DEFAULT now()
```

RLS: Authenticated users can SELECT where `is_active = true`. No write access.

Seeded with current FREE and AFFILIATE PRO items. Tournament Pro items are NOT seeded (tier is inactive).

**Table: `tier_feature_access`**

Maps which features each tier can access. Replaces the hardcoded `FEATURE_ACCESS` in `useSubscription.ts`.

```text
Columns:
  id            UUID PK
  tier_key      TEXT NOT NULL
  feature_key   TEXT NOT NULL
  UNIQUE(tier_key, feature_key)
  created_at    TIMESTAMPTZ DEFAULT now()
```

RLS: Authenticated users can SELECT. No write access.

Seeded with all current mappings (free, affiliate_pro, tournament_pro).

## Step 2: Refactor `useSubscription.ts`

Remove all hardcoded constants:
- Delete `type Tier`
- Delete `TIER_HIERARCHY`
- Delete `FEATURE_ACCESS`

New logic:
1. Fetch `tier_feature_access` rows from DB on mount
2. Fetch active `pricing_tiers` to get tier names and sort orders
3. Resolve user's current tier key (keep existing logic: check `user_subscriptions` then fallback to `profile.subscription_tier`)
4. Build a `Set` of allowed feature keys for the user's tier, including all features from lower-tier sort orders
5. `canAccess(feature)` checks membership in this set
6. Super user override: if user is in `super_users`, always return true
7. Export `tierName` (from `pricing_tiers.name`) and `tierKey` for UI consumers

## Step 3: Refactor `MainMenu.tsx`

Remove all hardcoded arrays and labels:
- Delete `FREE_ITEMS`, `AFFILIATE_ITEMS`, `PRO_ITEMS`
- Delete hardcoded `tierLabel` string mapping

New logic:
1. Fetch `menu_items` (where `is_active = true`) from DB on mount
2. Fetch active `pricing_tiers` (where `is_active = true`) from DB
3. Group menu items by `tier_key`
4. Only render sections for tiers that appear in active `pricing_tiers`
5. Section header label comes from `pricing_tiers.name`
6. Map `icon_name` string to Lucide component via a lookup object (e.g. `{ User: UserIcon, Trophy: TrophyIcon, Eye: EyeIcon, ... }`)
7. Tier badge in header uses `tierName` from `useSubscription` -- zero string comparisons
8. Preserve special "competitions" route logic (check `hasCompetitions` to toggle between `/competitions` and `/competition/create`)

## Step 4: Refactor `CompetitionHeader.tsx`

Remove hardcoded tier label/color mapping (lines 31-43).

New behavior:
- Replace `subscriptionTier` prop with `tierName` prop (string from `pricing_tiers.name`)
- If `tierName` exists and is not `"FREE"`, show badge with generic primary styling
- No tier-specific color conditions

## Step 5: Update Consumers

- `CompetitionDashboard.tsx`: Use `tierName` from `useSubscription` and pass to `CompetitionHeader` instead of `profile?.subscription_tier`
- `UpgradePackage.tsx`: Same minor prop change for `CompetitionHeader`

---

## Files Changed

| File | Type | Change |
|---|---|---|
| SQL Migration | NEW | Create `menu_items` and `tier_feature_access` tables with RLS + seed data |
| `src/hooks/useSubscription.ts` | MODIFIED | Fetch feature access from DB; remove all hardcoded maps; export `tierName`/`tierKey` |
| `src/pages/MainMenu.tsx` | MODIFIED | Fetch menu items and tiers from DB; remove hardcoded arrays and labels |
| `src/components/CompetitionHeader.tsx` | MODIFIED | Accept `tierName` prop; remove hardcoded tier string comparisons |
| `src/pages/CompetitionDashboard.tsx` | MODIFIED | Pass `tierName` to CompetitionHeader |
| `src/pages/UpgradePackage.tsx` | MODIFIED | Pass `tierName` to CompetitionHeader |

## What Will NOT Change

- RLS policies (already hardened)
- `SubscriptionGuard.tsx` (already works, uses `useSubscription`)
- `App.tsx` routes (already correct)
- Super user system (already implemented)
- Stripe/billing logic
- `UpgradePackage.tsx` tier cards (already fetch from DB)

## Result

- Disabling a tier in `pricing_tiers` automatically hides its menu section and features
- Adding a new tier + menu items + feature access rows renders them in the UI with zero code deployment
- Zero hardcoded tier names, feature lists, or menu arrays in frontend code
- Business team can manage tiers entirely through database configuration

