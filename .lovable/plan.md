

# V1 Production Refactor — Phase 2 Implementation Plan

## Overview

This phase adds schema gaps (DOB, age categories, registrations, brackets, bouts), a proper age calculation system, DOB dropdown UX, age eligibility enforcement, and leaderboard enhancements -- all without modifying Phase 1 architecture.

---

## Part 1: Database Migration

A single migration adding:

- `date_of_birth` (DATE) column to `profiles`
- `age_category_type` (TEXT DEFAULT 'open'), `min_age` (INTEGER), `max_age` (INTEGER) to `competitions`
- `athlete_registrations` table with RLS (authenticated SELECT; owner/super full CRUD; self-register INSERT where user_id = auth.uid())
- `brackets` table with RLS (authenticated SELECT; owner/super mutations)
- `bouts` table with RLS (authenticated SELECT; owner/super mutations via bracket->competition join)
- Enable realtime for `athlete_registrations`

All existing columns and data remain untouched.

---

## Part 2: Age Calculation Utility

**New file:** `src/utils/calculateAge.ts`

```text
export function calculateAge(dob: Date, referenceDate: Date = new Date()): number
```

- Compares year/month/day against referenceDate
- Leap-year safe
- Birthday on reference date increments age
- Standalone, no UI coupling

**Update:** `src/lib/validation.ts`
- Replace inline `calculateAge` with import from `src/utils/calculateAge`
- Backward compatible (default referenceDate = new Date())

---

## Part 3: DOB Dropdown Component

**New file:** `src/components/ui/DateOfBirthPicker.tsx`

Controlled component with:
- Year dropdown: current year back 100 years, scrollable
- Month dropdown: January-December
- Day dropdown: dynamic 28-31 based on month/year
- Future date prevention
- Inline validation errors
- Mobile-optimized full-width selects with touch-friendly sizing
- Emits ISO date string (YYYY-MM-DD)

**Update:** `src/pages/CreateProfile.tsx`
- Replace Calendar/Popover with DateOfBirthPicker
- Remove calendar-related imports
- Keep computed age read-only display

**Update:** `src/pages/ViewProfile.tsx`
- Same replacement as CreateProfile

---

## Part 4: Competition Domain + Create Form

**Update:** `src/domain/competition.ts`
- Add `age_category_type`, `min_age`, `max_age` to Competition interface

**Update:** `src/modules/tournaments/types.ts`
- Add age category fields to CreateCompetitionInput

**Update:** `src/modules/tournaments/api.ts`
- Include age category fields in createCompetition insert

**Update:** `src/pages/CompetitionCreate.tsx`
- Add age category section:
  - Dropdown: Open / Under X / Age Range
  - Conditional inputs for min_age/max_age
  - Validation: max_age > min_age when both set
- Persist to competitions table

**Update:** `src/pages/CompetitionDashboard.tsx`
- Display age category config in Setup tab (read-only badge showing category type and limits)

---

## Part 5: Eligibility Enforcement

**Update:** `src/modules/athletes/components/ParticipantsPanel.tsx`
- On self-register: fetch athlete DOB from profile, fetch competition date + age config
- Compute age via `calculateAge(dob, competitionDate)`
- Validate against min_age/max_age
- Block registration with clear error: "Athlete is not eligible for this age category."

**Database:** Add validation trigger on `athlete_registrations` INSERT as server-side safety net
- Computes age from profiles.date_of_birth vs competitions.date
- Rejects if outside min_age/max_age bounds

---

## Part 6: Leaderboard Enhancement

**Update:** `src/modules/leaderboard/components/LeaderboardPanel.tsx`
- Accept competition date and age category config
- Show age category label (e.g., "U18", "Masters 35-40", "Open")
- Age at competition computed client-side from participant DOB data
- Realtime updates remain functional (no changes to hooks)

---

## Part 7: Bracket/Bout Foundation

**Update:** `src/domain/competition.ts`
- Add `Bracket` and `Bout` interfaces

**Update:** `src/modules/tournaments/types.ts`
- Export Bracket, Bout types
- Add CreateBracketInput interface

**Update:** `src/modules/tournaments/api.ts`
- Add: fetchBrackets, createBracket, fetchBouts, updateBoutWinner

**Update:** `src/modules/tournaments/hooks.ts`
- Add: useBrackets, useCreateBracket, useBouts, useUpdateBoutWinner

Bracket grouping logic foundation: group by age category (dynamic from DOB + competition date), gender, weight class (placeholder). Age category never stored on athlete.

---

## Files Summary

### New Files
| File | Purpose |
|---|---|
| `src/utils/calculateAge.ts` | Age calculation with reference date |
| `src/components/ui/DateOfBirthPicker.tsx` | Year/month/day dropdown component |
| Migration SQL | Schema additions |

### Modified Files
| File | Change |
|---|---|
| `src/lib/validation.ts` | Import calculateAge from utils |
| `src/domain/competition.ts` | Add age category fields, Bracket, Bout interfaces |
| `src/modules/tournaments/types.ts` | Add age category to inputs, Bracket/Bout types |
| `src/modules/tournaments/api.ts` | Age category in create, bracket/bout API |
| `src/modules/tournaments/hooks.ts` | Bracket/bout hooks |
| `src/pages/CreateProfile.tsx` | Replace calendar with DOB dropdown |
| `src/pages/ViewProfile.tsx` | Replace calendar with DOB dropdown |
| `src/pages/CompetitionCreate.tsx` | Add age category config |
| `src/pages/CompetitionDashboard.tsx` | Show age category in setup |
| `src/modules/athletes/components/ParticipantsPanel.tsx` | Eligibility check |
| `src/modules/leaderboard/components/LeaderboardPanel.tsx` | Age display |
| `src/hooks/useProfile.ts` | Already has date_of_birth (no change needed) |

### Untouched (Phase 1)
- All module api/hooks patterns
- Realtime scoring infrastructure
- Mobile judge interface
- V1_FULL_ACCESS flag
- Auth system
- Edge functions

---

## Execution Order

1. Database migration (all schema changes in one migration)
2. Create `src/utils/calculateAge.ts`
3. Update `src/lib/validation.ts` to use new utility
4. Create `src/components/ui/DateOfBirthPicker.tsx`
5. Update CreateProfile.tsx and ViewProfile.tsx with DOB picker
6. Update domain types and tournament module (Competition, Bracket, Bout)
7. Update CompetitionCreate.tsx with age category config
8. Update CompetitionDashboard.tsx setup tab
9. Add bracket/bout API + hooks to tournaments module
10. Add eligibility enforcement to ParticipantsPanel
11. Enhance LeaderboardPanel with age category display

