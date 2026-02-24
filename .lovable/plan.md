

# Phase 2 Completion: Bracket Generation, Tournament Lifecycle, and Testing

## Overview

This plan covers four items: verifying existing DOB/eligibility features work correctly, then implementing two major new features -- automated bracket generation and a tournament lifecycle state machine.

---

## Part 1: DOB Picker and Age Eligibility (Verification)

The DOB picker, age calculation, and eligibility enforcement are already fully implemented:

- `DateOfBirthPicker.tsx` renders year/month/day dropdowns, emits ISO string
- `calculateAge()` and `checkAgeEligibility()` in `src/utils/calculateAge.ts` handle age computation
- `CreateProfile.tsx` and `ViewProfile.tsx` both use the picker and display computed age
- `ParticipantsPanel.tsx` checks eligibility on self-register using competition date as reference
- `CompetitionCreate.tsx` allows configuring age categories (Open, Under X, Age Range)

**No code changes needed** -- these will be verified via browser testing after implementation.

---

## Part 2: Automated Bracket Generation

### New file: `src/modules/tournaments/bracketGenerator.ts`

Pure logic module (no Supabase, no React) that:

1. Accepts a list of participants with profile data (DOB, gender) and competition config (date, age category, divisions)
2. Groups participants by:
   - Age category (computed dynamically from DOB + competition date)
   - Gender (from profile)
   - Division (from team assignment)
3. For each group, generates a single-elimination bracket:
   - Calculates rounds needed: `Math.ceil(Math.log2(participants.length))`
   - Seeds participants (simple sequential seeding for V1)
   - Creates bout matchups for round 1
   - Assigns byes when participant count is not a power of 2
   - Subsequent rounds have empty team slots (filled as winners advance)
4. Returns bracket and bout data structures ready for database insertion

### New file: `src/modules/tournaments/components/BracketsPanel.tsx`

UI component for the competition dashboard "Brackets" tab:

- Shows existing brackets grouped by division/age category
- "Generate Brackets" button (admin only) that calls the generator
- Visual bracket display showing rounds and matchups
- Each bout shows team names, winner selection button (admin/judge)
- Mobile-friendly card layout (no tables)
- Uses `useBrackets`, `useBouts`, `useCreateBracket`, `useUpdateBoutWinner` hooks

### Updates to existing files:

**`src/modules/tournaments/api.ts`**
- Add `createBracketWithBouts(competitionId, brackets)` -- batch insert bracket + bouts in one call
- Add `deleteBrackets(competitionId)` -- clear existing brackets for regeneration

**`src/modules/tournaments/hooks.ts`**
- Add `useGenerateBrackets` mutation hook
- Add `useDeleteBrackets` mutation hook

**`src/pages/CompetitionDashboard.tsx`**
- Add "Brackets" tab to owner and judge tab views
- Import and render `BracketsPanel`

---

## Part 3: Tournament Lifecycle State Machine

### New file: `src/modules/tournaments/stateMachine.ts`

Pure logic defining the competition lifecycle:

```text
States: draft -> registration -> seeding -> in_progress -> completed

Transitions:
  draft -> registration        (requires: at least 1 team, 1 workout)
  registration -> seeding      (requires: at least 2 registered participants)
  seeding -> in_progress       (requires: brackets generated)
  in_progress -> completed     (requires: all bouts resolved OR manual override)
  
  Backward transitions (admin only):
  registration -> draft
  seeding -> registration
```

Exports:
- `getAvailableTransitions(status, context)` -- returns valid next states
- `canTransition(from, to, context)` -- validates a specific transition
- `getStatusLabel(status)` -- human-readable label
- `getStatusColor(status)` -- badge color class

### Database migration

The `competitions.status` column already exists (DEFAULT 'draft'). No schema change needed -- just ensure the application uses the new states consistently.

### New file: `src/modules/tournaments/components/CompetitionStatusBar.tsx`

Horizontal status bar displayed at the top of the competition dashboard:

- Shows all 5 states as steps with the current one highlighted
- Forward/backward transition buttons (admin only)
- Confirmation dialog before state changes
- Validates prerequisites before allowing transitions (shows what's missing)
- Mobile-responsive (horizontal scroll or compact layout)

### Updates to existing files:

**`src/modules/tournaments/api.ts`**
- Add `updateCompetitionStatus(id, status)` function

**`src/modules/tournaments/hooks.ts`**
- Add `useUpdateCompetitionStatus` mutation hook

**`src/pages/CompetitionDashboard.tsx`**
- Add `CompetitionStatusBar` below the competition name
- Pass competition data and admin flag
- Conditionally disable certain tabs based on competition state (e.g., scoring only available in `in_progress`)

---

## File Summary

### New Files
| File | Purpose |
|---|---|
| `src/modules/tournaments/bracketGenerator.ts` | Pure bracket generation logic |
| `src/modules/tournaments/stateMachine.ts` | Competition lifecycle state machine |
| `src/modules/tournaments/components/BracketsPanel.tsx` | Bracket management UI |
| `src/modules/tournaments/components/CompetitionStatusBar.tsx` | Status bar with transitions |

### Modified Files
| File | Change |
|---|---|
| `src/modules/tournaments/api.ts` | Add bracket batch insert, delete, status update |
| `src/modules/tournaments/hooks.ts` | Add generation, deletion, status hooks |
| `src/pages/CompetitionDashboard.tsx` | Add Brackets tab + StatusBar |

### Unchanged
- All Phase 1 architecture (auth, scoring, realtime, mobile judge)
- DOB picker, age calculation, eligibility enforcement
- V1_FULL_ACCESS flag
- Database schema (uses existing tables)

---

## Execution Order

1. Create `stateMachine.ts` (pure logic, no dependencies)
2. Create `bracketGenerator.ts` (pure logic, uses calculateAge)
3. Add API functions to `tournaments/api.ts` (batch bracket insert, status update)
4. Add hooks to `tournaments/hooks.ts`
5. Create `CompetitionStatusBar.tsx` component
6. Create `BracketsPanel.tsx` component
7. Update `CompetitionDashboard.tsx` with new tab and status bar
8. Test end-to-end: create competition, set age category, register athletes, generate brackets, advance through lifecycle states

