
# Subscription-Gated Home Screen (MainMenu Redesign)

## What We're Building

The Main Menu (`/dashboard`) will be redesigned to render different feature sets based on the user's subscription tier. Instead of a flat list of generic menu items, the screen becomes a **personalized home hub** that shows exactly what the user can do — and upsells locked features with a preview of what they'd unlock.

---

## Tier Feature Matrix

| Feature | Free | Affiliate Pro | Tournament Pro |
|---|---|---|---|
| View Your Profile | YES | YES | YES |
| View Competition Leaderboards | YES | YES | YES |
| Create & Manage Competitions | NO (locked) | YES | YES |
| Get Members Linked to Account | NO (locked) | YES | YES |
| Link Gym Website | NO (locked) | YES | YES |
| Manage Your Affiliation | NO (locked) | YES | YES |
| Track Member Performances | NO (locked) | YES | YES |
| Advanced Analytics | NO (locked) | NO (locked) | YES |
| Custom Branding | NO (locked) | NO (locked) | YES |

---

## Architecture

### New Hook: `src/hooks/useSubscription.ts`
This hook reads `user_subscriptions` from the database and exposes:
- `tier` — the resolved subscription tier key (`'free'`, `'affiliate_pro'`, `'tournament_pro'`)
- `isAffiliatePro` — boolean convenience flag
- `isTournamentPro` — boolean convenience flag
- `canAccess(feature: string)` — feature-gating function

The hook **falls back to `profile.subscription_tier`** (already populated and synced by the webhook) when `user_subscriptions` has no active row. This makes it resilient and non-breaking for existing sessions.

### Updated: `src/pages/MainMenu.tsx`
The page is rebuilt around three visually distinct sections:

**Section 1 — Always Available (Free tier)**
- View Your Profile
- View Competition Leaderboards

**Section 2 — Affiliate Pro Features**
Shown as active buttons for Affiliate Pro and Tournament Pro users.
Shown as locked/preview cards for Free users (with an "Upgrade" CTA).
- Get Members Linked to Your Account
- Link Your Gym Website
- Create & Manage Competitions
- Manage Your Affiliation
- Track Member Performances

**Section 3 — Tournament Pro Features**
Active for Tournament Pro only. Locked preview for Free and Affiliate Pro users.
- Advanced Analytics
- Custom Branding

---

## Visual Design

### Active menu items (accessible):
```
┌─────────────────────────────────────────────────────┐
│  [ICON]  FEATURE LABEL                    →          │
└─────────────────────────────────────────────────────┘
```
Same as the current card style: `bg-card border border-border hover:border-primary/40`

### Locked menu items (not on tier):
```
┌─────────────────────────────────────────────────────┐
│  [🔒]   FEATURE LABEL                    UPGRADE →  │
│         Requires Affiliate Pro                       │
└─────────────────────────────────────────────────────┘
```
Rendered with muted colors, lock icon, and a right-side "Upgrade" badge chip that navigates to `/upgrade`.

### Section headers:
Each tier block has a small section label:
- `— FREE —`
- `— AFFILIATE PRO —`
- `— TOURNAMENT PRO —`

Section header color is muted for locked tiers and accented for the user's current tier.

### Header upgrade nudge:
For Free users, the tier badge in the header becomes a clickable `UPGRADE` button styled as a small accent chip.

---

## Technical Implementation

### Step 1 — Create `src/hooks/useSubscription.ts`

```typescript
// Reads from user_subscriptions (active rows) with fallback to profile.subscription_tier
// Exposes: { tier, isAffiliatePro, isTournamentPro, canAccess, loading }

const FEATURE_ACCESS: Record<string, string[]> = {
  view_profile:         ['free', 'affiliate_pro', 'tournament_pro'],
  view_leaderboards:    ['free', 'affiliate_pro', 'tournament_pro'],
  create_competitions:  ['affiliate_pro', 'tournament_pro'],
  manage_members:       ['affiliate_pro', 'tournament_pro'],
  link_gym_website:     ['affiliate_pro', 'tournament_pro'],
  manage_affiliation:   ['affiliate_pro', 'tournament_pro'],
  track_performances:   ['affiliate_pro', 'tournament_pro'],
  advanced_analytics:   ['tournament_pro'],
  custom_branding:      ['tournament_pro'],
};
```

The hook queries `user_subscriptions` for `status = 'active'` for the current user. If no row is found, it uses `profile.subscription_tier`. This means zero breaking changes to existing billing flow.

### Step 2 — Rebuild `src/pages/MainMenu.tsx`

**Key structural changes:**
- Import `useSubscription` hook
- Replace flat `menuItems[]` with two typed arrays: `freeItems[]`, `affiliateItems[]`, `proItems[]`
- Each item has: `{ label, icon, route, feature, description }`
- Render each section with a `SectionHeader` and either active `MenuButton` or locked `LockedMenuButton`
- Keep identical header, skeleton loading, and error states
- Keep existing `hasCompetitions` logic — the "Create Competition" vs "View/Build" dynamic is preserved

**New local components (defined inline, no new files needed):**
- `SectionHeader` — renders the tier section label
- `ActiveMenuItem` — the current button style
- `LockedMenuItem` — muted locked style with Lock icon and "Upgrade" chip

### Step 3 — No backend changes

`profile.subscription_tier` is already the authoritative synced field. The `useSubscription` hook reads from the database `user_subscriptions` table for the active row (already has RLS `SELECT` for own rows), and falls back gracefully.

No new database migrations required.

---

## Files Changed

| File | Change Type |
|---|---|
| `src/hooks/useSubscription.ts` | NEW — subscription tier + feature-gate hook |
| `src/pages/MainMenu.tsx` | MODIFIED — subscription-gated section layout |

No frontend routing changes. No backend changes. No migration required.

---

## Example Rendered States

**Free User sees:**
```
— FREE —
[👤] VIEW PROFILE            →
[🏆] VIEW COMPETITION LEADERBOARDS →

— AFFILIATE PRO —  ← muted label
[🔒] MANAGE MEMBERS          UPGRADE →
[🔒] LINK GYM WEBSITE        UPGRADE →
[🔒] CREATE COMPETITIONS     UPGRADE →
[🔒] MANAGE AFFILIATION      UPGRADE →
[🔒] TRACK MEMBER PERFORMANCES UPGRADE →

— TOURNAMENT PRO — ← muted label
[🔒] ADVANCED ANALYTICS      UPGRADE →
[🔒] CUSTOM BRANDING         UPGRADE →
```

**Affiliate Pro User sees:**
```
— FREE —
[👤] VIEW PROFILE            →
[🏆] VIEW COMPETITION LEADERBOARDS →

— AFFILIATE PRO — ← accented label
[👥] MANAGE MEMBERS          →
[🔗] LINK GYM WEBSITE        →
[🏆] CREATE COMPETITIONS     →
[⚙️] MANAGE AFFILIATION      →
[📊] TRACK MEMBER PERFORMANCES →

— TOURNAMENT PRO — ← muted label
[🔒] ADVANCED ANALYTICS      UPGRADE →
[🔒] CUSTOM BRANDING         UPGRADE →
```

**Tournament Pro User sees all items active.**

---

## Safety Guarantees

- Zero breaking changes to existing billing or auth flow
- `profile.subscription_tier` remains the fallback source of truth
- Locked items navigate to `/upgrade` — no dead ends
- `hasCompetitions` dynamic CTA is preserved inside the create competition item
- All existing header, loading, and error states are preserved exactly
