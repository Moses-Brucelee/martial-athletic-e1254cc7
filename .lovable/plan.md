

# Upgrade Package / Subscription Tier Selection Page

## Overview

Build an `/upgrade` page where users can view and select subscription tiers (Free, Affiliate Pro, Tournament Pro). This page will display a pricing card layout comparing features across tiers, with the user's current tier highlighted.

Since there is no payment integration yet, selecting a tier will show a confirmation flow. We can integrate Stripe later for actual payments.

---

## Route

- `/upgrade` -- new protected route, linked from Main Menu's "UPGRADE PACKAGE" button

---

## UI Design

Follows the existing dark fitness aesthetic with the `CompetitionHeader` at the top.

### Layout (mobile-first, 1 column stacking to 3 columns on desktop)

Three pricing cards side by side:

1. **FREE** (current default)
   - Green outline / subtle card
   - Features: 1 competition, basic dashboard, community access
   - "CURRENT PLAN" badge if active

2. **AFFILIATE PRO** 
   - Green accent card (accent color)
   - Features: Unlimited competitions, team management, priority support
   - Price placeholder (e.g., "$X/month")
   - CTA button: "UPGRADE" or "CURRENT PLAN"

3. **TOURNAMENT PRO**
   - Red/primary accent card (primary color)
   - "MOST POPULAR" badge
   - Features: Everything in Affiliate Pro + advanced analytics, custom branding, API access
   - Price placeholder
   - CTA button: "UPGRADE" or "CURRENT PLAN"

### Interactions

- Current tier card shows a "CURRENT PLAN" badge and disabled button
- Other tiers show an "UPGRADE" button
- Clicking "UPGRADE" opens a confirmation dialog (no payment yet -- just updates the `subscription_tier` column in profiles for demo purposes, or shows a "Coming Soon" toast)

---

## Technical Details

### New file: `src/pages/UpgradePackage.tsx`

- Uses `CompetitionHeader` with title "UPGRADE"
- Uses `useProfile` hook to read current `subscription_tier`
- Displays 3 tier cards using existing Card components
- Each card lists features with check/cross icons
- Upgrade button triggers a toast: "Payment integration coming soon" (or optionally updates the tier directly for demo)

### Modified files

- **`src/App.tsx`**: Add route `/upgrade` pointing to `UpgradePackage`
- **`src/pages/MainMenu.tsx`**: Update "UPGRADE PACKAGE" button to navigate to `/upgrade`

### No database changes required

The `profiles.subscription_tier` column already exists. No new tables or migrations needed.

### Components used

- `CompetitionHeader` (existing)
- `Card`, `CardHeader`, `CardContent`, `CardFooter` (existing)
- `Button` (existing)
- `Badge` (existing)
- `useProfile` hook (existing)
- `Check`, `X` icons from lucide-react
- `toast` from sonner for feedback

