

# Main Menu Redesign + 404 Route Fixes

## Overview

Redesign the post-login dashboard (`/dashboard`) to include content spotlight sections below the existing DB-driven menu, and fix all 404 routes with placeholder pages. All existing menu logic, subscription gating, and DB queries remain untouched.

## Phase 1 -- Create Spotlight Components

Four new modular components will be created in `src/components/dashboard/`:

### UpcomingCompetitionsSpotlight.tsx
- Uses TanStack Query (`useQuery`) to fetch from the `competitions` table
- Query: competitions where `date >= today`, ordered by date ascending, limit 5
- Fallback: if none found, fetches 5 most recent (date descending)
- Shows cards with competition name, date, venue, host gym
- Each card has a "View" button linking to `/competition/:id`
- Loading state: skeleton cards
- Error state: renders nothing (never blocks dashboard)

### BrowseMarketplaceSection.tsx
- Static tab buttons: Programs, Competitions, Apparel, Equipment
- Tabs defined as a constant array
- All tabs navigate to `/browse`
- Placeholder content below tabs ("Coming soon" style)

### ShopSpotlight.tsx
- Static placeholder card with image placeholder area
- Title, short description, CTA button linking to `/browse`

### ProgramSpotlight.tsx
- Static placeholder card
- Title, description, CTA button linking to `/browse`

## Phase 2 -- Update MainMenu.tsx

All existing logic preserved exactly as-is:
- `useProfile`, `useSubscription`, `useAuth`, `V1_FULL_ACCESS`
- `menu_items` and `pricing_tiers` DB queries
- Section grouping, tier gating, `handleItemClick`
- Loading/error states

Changes:
- Import the 4 new spotlight components
- Add them below the existing menu sections in the `<main>` area
- Menu button styling updated to be more compact with inline tier badges matching the reference image style
- Spotlight section errors never block dashboard rendering

Layout order:
```text
Header (unchanged)
DB-driven menu sections (logic unchanged, styling updated)
Upcoming Competitions Spotlight
Browse Marketplace
Shop Spotlight
Program Spotlight
```

## Phase 3 -- Create Placeholder Pages

Four new pages, each with consistent styling:
- Header with logo and back button
- Descriptive icon, title, description
- "Back to Main Menu" button

| File | Route | Title |
|---|---|---|
| `src/pages/Affiliation.tsx` | `/affiliation` | Manage Affiliation |
| `src/pages/GymWebsite.tsx` | `/gym-website` | Link Gym Website |
| `src/pages/Performances.tsx` | `/performances` | Track Performances |
| `src/pages/Browse.tsx` | `/browse` | Browse Marketplace |

## Phase 4 -- Update App.tsx Routes

Add 4 new routes above the catch-all:
- `/affiliation` -- wrapped in `ProtectedRoute`
- `/gym-website` -- wrapped in `ProtectedRoute`
- `/performances` -- wrapped in `ProtectedRoute`
- `/browse` -- public (no auth required)

## Files Summary

| File | Action |
|---|---|
| `src/components/dashboard/UpcomingCompetitionsSpotlight.tsx` | CREATE |
| `src/components/dashboard/BrowseMarketplaceSection.tsx` | CREATE |
| `src/components/dashboard/ShopSpotlight.tsx` | CREATE |
| `src/components/dashboard/ProgramSpotlight.tsx` | CREATE |
| `src/pages/MainMenu.tsx` | UPDATE -- import spotlights, add below menu, restyle buttons |
| `src/pages/Affiliation.tsx` | CREATE |
| `src/pages/GymWebsite.tsx` | CREATE |
| `src/pages/Performances.tsx` | CREATE |
| `src/pages/Browse.tsx` | CREATE |
| `src/App.tsx` | UPDATE -- add 4 routes |

## What Does NOT Change

- No database schema changes
- No new tables
- No RLS policy changes
- No subscription logic changes
- No menu_items or pricing_tiers query changes
- No changes to existing routes
- Dashboard renders even if spotlight queries fail

