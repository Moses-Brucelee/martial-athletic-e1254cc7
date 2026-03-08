

# Competition Lifecycle, Workout Builder, and Scoring Overhaul

This is a major feature set spanning database schema changes, API-layer enforcement, and a multi-step creation wizard. The work is broken into 4 phases.

---

## Phase 1: Database Schema Changes

### 1A. Update `competitions` table

Add new date/time columns for lifecycle management:

- `start_date` (timestamptz, nullable) -- when competition goes live
- `end_date` (timestamptz, nullable) -- when competition ends
- `registration_deadline` (timestamptz, nullable) -- cutoff for registration
- `description` (text, nullable) -- new field for Step 1

The existing `status` column (text) will remain but its values change to: `draft`, `published`, `live`, `completed`, `expired`. The existing `date` column is kept for backward compatibility.

### 1B. New `workout_movements` table

```text
workout_movements
  id                uuid PK default gen_random_uuid()
  workout_id        uuid NOT NULL -> competition_workouts.id (ON DELETE CASCADE)
  movement_name     text NOT NULL
  reps              integer
  weight            numeric
  unit              text default 'kg'
  sequence_order    integer NOT NULL default 0
  created_at        timestamptz default now()
```

RLS: Same pattern as workouts -- authenticated SELECT, owner/super INSERT/UPDATE/DELETE.

### 1C. Update `competition_workouts` table

Add columns:
- `workout_type` (text, default 'custom') -- values: amrap, for_time, max_load, rounds, custom
- `time_cap_seconds` (integer, nullable)
- `scoring_type` (text, default 'reps') -- values: time, reps, load, points

The existing `measurement_type` column is replaced by `scoring_type` logically. We keep `measurement_type` for backward compat and map it in code.

### 1D. Update `competition_scores` table

Add columns:
- `reps_completed` (integer, nullable)
- `time_seconds` (integer, nullable)
- `load_value` (numeric, nullable)
- `points_awarded` (numeric, nullable)

The existing `score` column is kept as the canonical ranking value. The new columns store the raw data; `score` is computed/populated based on workout scoring_type.

### 1E. Server-side status derivation function

Create a database function `get_competition_status(p_competition_id uuid)` that returns the derived status based on dates:

```text
IF now() < registration_deadline -> 'published'
IF start_date <= now() <= end_date -> 'live'
IF end_date < now() <= end_date + 30 days -> 'completed'
IF end_date + 30 days < now() -> 'expired'
ELSE -> status column value (for drafts)
```

---

## Phase 2: API-Layer Mutation Blocking

### 2A. Competition lock guard

Create a reusable helper in `src/modules/tournaments/api.ts`:

```typescript
async function assertCompetitionMutable(competitionId: string): Promise<void> {
  const comp = await fetchCompetition(competitionId);
  const status = deriveStatus(comp); // client-side derivation using same logic
  if (status === 'completed' || status === 'expired') {
    throw new Error('Competition is locked and cannot be modified');
  }
}
```

Every mutation function (addTeam, removeTeam, addWorkout, upsertScores, etc.) will call this guard before proceeding.

### 2B. Update state machine

Replace the current `stateMachine.ts` with the new date-driven status model. The `CompetitionStatus` type becomes:

```typescript
type CompetitionStatus = 'draft' | 'published' | 'live' | 'completed' | 'expired';
```

A pure `deriveStatus(comp)` function computes status from `start_date`, `end_date`, `registration_deadline` and `now()`. The manual status toggle (CompetitionStatusBar) is removed for non-draft competitions -- status transitions are automatic.

### 2C. Domain model update

Update `src/domain/competition.ts` Competition interface to include new fields: `start_date`, `end_date`, `registration_deadline`, `description`.

Update `src/domain/competition.ts` Workout interface to include: `workout_type`, `time_cap_seconds`, `scoring_type`.

Add new domain interface `WorkoutMovement` with fields: `id`, `workout_id`, `movement_name`, `reps`, `weight`, `unit`, `sequence_order`.

Update `src/domain/scoring.ts` Score interface to include: `reps_completed`, `time_seconds`, `load_value`, `points_awarded`.

---

## Phase 3: Competition List Filtering

### 3A. Update `fetchCompetitions` query

Filter to only competitions where `end_date >= now() - 30 days` OR `end_date IS NULL` (drafts). Order by `start_date`.

### 3B. Update `CompetitionList.tsx`

Group competitions into sections:
- **Upcoming** (published, start_date > now)
- **Live** (start_date <= now <= end_date)
- **Completed** (end_date passed, within 30 days)

Each section gets a distinct visual treatment. Expired competitions are excluded from the list but remain accessible via direct URL `/competition/:id`.

### 3C. Dashboard enforcement

In `CompetitionDashboard.tsx`, derive status and conditionally:
- Hide all mutation tabs/buttons when status is `completed` or `expired`
- Show only leaderboard tab for completed/expired
- Display a banner: "This competition has ended. Viewing leaderboard only."

---

## Phase 4: Step-Based Competition Creation Wizard

### 4A. New multi-step wizard page

Replace the current single-page `CompetitionCreate.tsx` with a step-based wizard with 3 steps:

**Step 1 -- Core Setup:**
- Name (required)
- Description (new, textarea)
- Location/Venue
- Start Date (required)
- End Date (required)
- Registration Deadline (required)
- Type (e.g. CrossFit, MMA)
- Host Gym
- Save creates a `draft` competition.

**Step 2 -- Divisions:**
- Reuses the existing `DivisionsPanel` component in an inline wizard context
- Each division: Name, Age range (optional), Gender (optional)
- Add/remove divisions dynamically

**Step 3 -- Workouts (New Workout Builder):**
- For each workout:
  - Workout Name
  - Workout Type selector (AMRAP, For Time, Max Load, Rounds, Custom)
  - Time Cap (seconds input, shown for AMRAP/For Time)
  - Scoring Type (auto-suggested based on workout type, overridable)
  - **Movements sub-form** (dynamic list):
    - Movement Name (text input)
    - Reps (number)
    - Weight (number, optional)
    - Unit (kg/lb selector, optional)
    - Reorder via up/down buttons
  - Add/remove movements
- Add/remove workouts
- Save all workouts + movements, then navigate to competition dashboard

### 4B. Wizard navigation

- Step indicator bar at the top (Step 1 of 3, Step 2 of 3, etc.)
- Back/Next buttons
- Draft is saved at Step 1; Steps 2-3 update the existing draft
- User can leave and resume (data persists in DB)

### 4C. Workout Builder component

New component `src/modules/tournaments/components/WorkoutBuilder.tsx`:
- Self-contained workout editor with movement sub-forms
- Manages local state, saves via new API functions
- Validates: at least 1 movement per workout, movement name required

### 4D. New API functions

In `src/modules/tournaments/api.ts`:
- `fetchWorkoutMovements(workoutId: string): Promise<WorkoutMovement[]>`
- `saveWorkoutWithMovements(competitionId, workout, movements[])` -- upserts workout row + deletes/inserts movements
- `removeWorkoutMovement(id: string)`

In `src/modules/tournaments/hooks.ts`:
- `useWorkoutMovements(workoutId)` -- query hook
- `useSaveWorkoutWithMovements()` -- mutation hook

---

## Files Changed Summary

| File | Change |
|------|--------|
| DB migration | Add columns to competitions, competition_workouts, competition_scores; create workout_movements table; create get_competition_status function; add RLS policies |
| `src/domain/competition.ts` | Add new fields to Competition and Workout interfaces; add WorkoutMovement interface |
| `src/domain/scoring.ts` | Add reps_completed, time_seconds, load_value, points_awarded to Score |
| `src/modules/tournaments/types.ts` | Re-export WorkoutMovement; update CreateCompetitionInput |
| `src/modules/tournaments/stateMachine.ts` | Replace with date-driven deriveStatus logic |
| `src/modules/tournaments/api.ts` | Add mutation guard, movement CRUD, update fetchCompetitions filter |
| `src/modules/tournaments/hooks.ts` | Add movement hooks, update competition hooks |
| `src/modules/scoring/types.ts` | Update Score re-export |
| `src/lib/validation.ts` | Add workout/movement validation schemas |
| `src/pages/CompetitionCreate.tsx` | Rewrite as 3-step wizard |
| `src/pages/CompetitionWorkouts.tsx` | Remove (merged into wizard Step 3) |
| `src/pages/CompetitionList.tsx` | Add grouped sections, filter expired |
| `src/pages/CompetitionDashboard.tsx` | Add completed/expired enforcement, hide mutations |
| `src/modules/tournaments/components/WorkoutBuilder.tsx` | New -- workout + movement builder UI |
| `src/modules/tournaments/components/CompetitionStatusBar.tsx` | Update for date-driven statuses |
| `src/modules/tournaments/components/WorkoutsPanel.tsx` | Show workout type, movements, scoring type |
| `src/modules/scoring/components/ScoresPanel.tsx` | Support multi-field scoring (reps, time, load) |
| `src/App.tsx` | Remove `/competition/:id/workouts` route (now part of wizard) |

---

## Implementation Order

1. Database migration (schema + RLS + function)
2. Domain interfaces update
3. State machine rewrite (deriveStatus)
4. API layer (mutation guard + movement CRUD + filtered fetch)
5. Hooks layer
6. Competition List page (grouped sections)
7. Competition Create wizard (3 steps)
8. Workout Builder component
9. Dashboard enforcement (read-only for completed/expired)
10. Scores Panel update (multi-field scoring)

