

# V1 Architecture Refactor

## Guiding Principle: Role-Based Access Stays, Subscription Gating Goes

All competition role logic (owner, judge, viewer) is **preserved exactly as-is**. Only the `has_competition_access()` subscription check and frontend tier gating are bypassed.

---

## Part 1: Database Migration

### 1A. New Tables

**`athlete_registrations`**

| Column | Type | Default | Notes |
|---|---|---|---|
| id | UUID PK | gen_random_uuid() | |
| competition_id | UUID NOT NULL | | FK-like, not enforced |
| user_id | UUID | NULL | nullable for manual adds |
| athlete_name | TEXT NOT NULL | | |
| team_id | UUID | NULL | assigned after registration |
| status | TEXT | 'pending' | pending, confirmed, rejected |
| created_at | TIMESTAMPTZ | now() | |

RLS: Authenticated SELECT. Owner/super INSERT/UPDATE/DELETE. Self-register INSERT (`user_id = auth.uid()`).

**`brackets`**

| Column | Type | Default |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| competition_id | UUID NOT NULL | |
| division_id | UUID | NULL |
| name | TEXT NOT NULL | |
| bracket_type | TEXT | 'single_elimination' |
| created_at | TIMESTAMPTZ | now() |

RLS: Authenticated SELECT. Owner/super mutations.

**`bouts`**

| Column | Type | Default |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| bracket_id | UUID NOT NULL | |
| round_number | INT NOT NULL | |
| bout_number | INT NOT NULL | |
| team_a_id | UUID | NULL |
| team_b_id | UUID | NULL |
| winner_id | UUID | NULL |
| status | TEXT | 'pending' |
| created_at | TIMESTAMPTZ | now() |

RLS: Authenticated SELECT. Owner/super mutations.

### 1B. Schema Modification

- Add `date_of_birth DATE` column to `profiles` (nullable, keeps existing `age` column)

### 1C. Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.competition_scores;
```

### 1D. RLS Update for V1

Update `has_competition_access()` function to always return `true` for V1 (keeps the function signature so all existing RLS policies still reference it, but removes the subscription check):

```sql
CREATE OR REPLACE FUNCTION public.has_competition_access(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT true;
$$;
```

This single change makes all existing RLS policies pass for any authenticated user while **preserving `is_competition_owner()` and `is_competition_judge()` checks** in those same policies. When subscriptions return, just restore the original function body.

---

## Part 2: Feature Flag + Subscription Bypass

### New file: `src/lib/featureFlags.ts`

```typescript
export const V1_FULL_ACCESS = true;
```

### Modify: `src/hooks/useSubscription.ts`

- Import `V1_FULL_ACCESS`
- When `true`: `canAccess()` always returns `true`, skip all DB fetches for tier resolution
- Keep all existing logic intact (just short-circuited)

### Modify: `src/pages/MainMenu.tsx`

- When `V1_FULL_ACCESS`: render all menu items as `ActiveMenuItem`, hide UPGRADE badge

### Modify: `src/components/CompetitionHeader.tsx`

- When `V1_FULL_ACCESS`: hide tier badge

### Modify: `src/App.tsx`

- Remove `SubscriptionGuard` wrapper from `/competition/create` and `/competition/:id/workouts` routes (no longer needed when all features are open)

### Modify: `src/pages/CompetitionDashboard.tsx`

- When `V1_FULL_ACCESS`:
  - `canAdmin = isOwner || isSuperUser` (no tier check, but still requires ownership)
  - `canScore = isOwner || isJudge || isSuperUser` (no tier check, but still requires judge/owner role)

**Role matrix preserved:**

| Role | Setup/Config | Add Judges | Score | Leaderboard | View |
|---|---|---|---|---|---|
| Owner | Yes | Yes | Yes | Yes | Yes |
| Judge | No | No | Yes | Yes | Yes |
| Viewer | No | No | No | Yes | Yes |
| Super User | Yes | Yes | Yes | Yes | Yes |

---

## Part 3: Module Architecture

### New folder structure

```text
src/modules/
  tournaments/
    types.ts
    api.ts
    hooks.ts
    components/
      TeamsPanel.tsx
      WorkoutsPanel.tsx
      DivisionsPanel.tsx
  scoring/
    types.ts
    api.ts
    hooks.ts
    components/
      ScoresPanel.tsx
      ScoreLockControls.tsx
      MobileJudgeScoring.tsx   (NEW)
  leaderboard/
    types.ts
    api.ts
    hooks.ts
    components/
      LeaderboardPanel.tsx
  athletes/
    types.ts
    api.ts
    hooks.ts
    components/
      ParticipantsPanel.tsx
  auth/
    types.ts
    api.ts
    hooks.ts
  admin/
    types.ts
    api.ts
    hooks.ts
    components/
      CompetitionManager.tsx
      SeasonManager.tsx
      AuditLog.tsx
      ScoreOverride.tsx
```

### Data Flow Pattern (every module)

```text
api.ts          -- Raw Supabase queries (ONLY file that imports supabase client)
hooks.ts        -- TanStack Query hooks wrapping api.ts functions
components/     -- UI components consuming hooks (NO direct Supabase imports)
types.ts        -- TypeScript interfaces (re-exported from domain/ where applicable)
```

### Module: `tournaments`

**`api.ts`**: Consolidates all calls currently scattered across CompetitionDashboard, CompetitionList, CompetitionCreate, CompetitionWorkouts, and `data/divisions.ts`.

- `fetchCompetition(id)`, `fetchCompetitions()`, `createCompetition(data)`
- `fetchTeams(competitionId)`, `addTeam(...)`, `removeTeam(...)`
- `fetchWorkouts(competitionId)`, `addWorkout(...)`, `removeWorkout(...)`, `updateWorkoutMeasurement(...)`
- Re-exports from `data/divisions.ts`: `fetchDivisions`, `addDivision`, `removeDivision`

**`hooks.ts`**: TanStack Query hooks with proper cache keys and invalidation.

- `useCompetition(id)` -- replaces inline fetch in CompetitionDashboard
- `useCompetitions()` -- replaces inline fetch in CompetitionList
- `useTeams(competitionId)` -- replaces prop-drilled teams state
- `useWorkouts(competitionId)` -- replaces prop-drilled workouts state
- `useDivisions(competitionId)` -- replaces prop-drilled divisions state
- `useCreateCompetition()` -- mutation
- `useAddTeam()`, `useRemoveTeam()` -- mutations invalidating `['teams', id]`
- `useAddWorkout()`, `useRemoveWorkout()`, `useUpdateWorkoutMeasurement()` -- mutations

### Module: `scoring`

**`api.ts`**: Consolidates from `data/scoring.ts` + inline ScoresPanel calls.

- `fetchScores(competitionId)`, `upsertScores(...)`, `lockWorkout(...)`, `unlockWorkout(...)`, `lockScore(...)`, `unlockScore(...)`

**`hooks.ts`**:

- `useScores(competitionId)` -- TanStack Query + Supabase Realtime subscription. On `postgres_changes` event for `competition_scores`, invalidates query cache.
- `useUpsertScores()` -- mutation with optimistic update: immediately updates local cache, rolls back on error.
- `useLockWorkout()`, `useUnlockWorkout()` -- mutations invalidating `['workouts', id]`

### Module: `leaderboard`

**`api.ts`**: From `data/leaderboard.ts`.

**`hooks.ts`**: Refactored `useLeaderboard` using TanStack Query + existing realtime subscription pattern. The realtime subscription invalidates the query cache instead of managing state directly.

### Module: `athletes`

**`api.ts`**: From `data/participants.ts`.

**`hooks.ts`**: `useParticipants(competitionId)`, `useAddParticipant()`, `useRemoveParticipant()`, `useSelfRegister()`.

### Module: `auth`

**`api.ts`**: Profile CRUD (extracted from useProfile inline calls).

**`hooks.ts`**: `useProfile()` refactored with TanStack Query. `useCompetitionRole()` stays as hook (already clean).

### Module: `admin`

**`api.ts`**: Super user checks, judge management (from `data/judges.ts`, `data/superAdmin.ts`).

**`hooks.ts`**: `useSuperUserAccess()`, `useJudges(competitionId)`.

**`components/`**: Move super admin components here.

---

## Part 4: Refactor CompetitionDashboard to Layout-Only

### Current problems

- Fetches 5 tables in one `useEffect`
- Manages state for teams, workouts, divisions, judges via `useState`
- Props drilled through every panel

### New approach

```typescript
export default function CompetitionDashboard() {
  const { id } = useParams<{ id: string }>();
  const { data: competition, isLoading } = useCompetition(id);
  const { isOwner, isJudge, role } = useCompetitionRole(id);
  const { isSuperUser } = useSuperUserAccess();
  const { profile } = useProfile();

  const canAdmin = isOwner || isSuperUser;
  const canScore = isOwner || isJudge || isSuperUser;

  // Each tab panel fetches its own data via module hooks
  // No prop drilling, no local state for teams/workouts/divisions
  return (
    <Layout>
      {canAdmin ? <OwnerTabs /> : isJudge ? <JudgeTabs /> : <ViewerTabs />}
    </Layout>
  );
}
```

Each panel (TeamsPanel, ScoresPanel, etc.) internally calls its own hook (`useTeams`, `useScores`, etc.) and manages its own mutations. Only `competitionId`, `canAdmin`, and `canScore` are passed as props.

---

## Part 5: Mobile-First Judge Scoring UI

### New component: `src/modules/scoring/components/MobileJudgeScoring.tsx`

- Full-screen card-based layout (one team per card)
- Large number input with +/- buttons (min 48x48px touch targets)
- Team name + division displayed prominently
- Swipe/arrow navigation between teams
- Workout selector pills at top
- Lock indicator per workout
- Sticky "Save All Scores" button at bottom
- No horizontal scroll tables

### Integration

- `ScoresPanel` (desktop): existing table layout, refactored to use `useScores()` hook
- `MobileJudgeScoring` (mobile): card layout, same `useScores()` hook
- CompetitionDashboard Scores tab uses `useIsMobile()` to render the appropriate component
- Both share the same `useUpsertScores()` mutation with optimistic updates

---

## Part 6: Profile DOB Field

- Add `date_of_birth` column to `profiles` (migration)
- Update `CreateProfile.tsx` and `ViewProfile.tsx` to show a date picker
- Keep `age` field for backward compat; compute display age from DOB when available
- Update `profileSchema` in `validation.ts` to include optional `dateOfBirth`
- Update `Profile` interface in `auth/types.ts`

---

## Part 7: UI Polish

- Card-based layouts for teams, workouts, participants (replacing dense lists)
- Mobile responsive tabs (horizontally scrollable `TabsList` on small screens with `overflow-x-auto`)
- Better spacing (increased padding, section dividers)
- Keep existing theme and color scheme -- no redesign

---

## Part 8: Code Quality

- Strict TypeScript: no `any` types in new module files
- Old `data/` and `domain/` files become thin re-exports to avoid breaking any remaining imports
- Remove dead code and unused imports from refactored pages
- Standardized loading/error pattern across all hooks:
  ```typescript
  { data, isLoading, isError, error }
  ```

---

## Files Summary

### New Files (~30)

| File | Purpose |
|---|---|
| `src/lib/featureFlags.ts` | V1_FULL_ACCESS flag |
| `src/modules/tournaments/types.ts` | Tournament types |
| `src/modules/tournaments/api.ts` | All tournament DB queries |
| `src/modules/tournaments/hooks.ts` | TanStack Query hooks |
| `src/modules/tournaments/components/TeamsPanel.tsx` | Self-contained teams UI |
| `src/modules/tournaments/components/WorkoutsPanel.tsx` | Self-contained workouts UI |
| `src/modules/tournaments/components/DivisionsPanel.tsx` | Self-contained divisions UI |
| `src/modules/scoring/types.ts` | Scoring types |
| `src/modules/scoring/api.ts` | Scoring DB queries |
| `src/modules/scoring/hooks.ts` | Scoring hooks + realtime |
| `src/modules/scoring/components/ScoresPanel.tsx` | Desktop score entry |
| `src/modules/scoring/components/ScoreLockControls.tsx` | Lock controls |
| `src/modules/scoring/components/MobileJudgeScoring.tsx` | Mobile judge UI |
| `src/modules/leaderboard/types.ts` | Leaderboard types |
| `src/modules/leaderboard/api.ts` | Leaderboard queries |
| `src/modules/leaderboard/hooks.ts` | Leaderboard hooks + realtime |
| `src/modules/leaderboard/components/LeaderboardPanel.tsx` | Leaderboard UI |
| `src/modules/athletes/types.ts` | Athlete types |
| `src/modules/athletes/api.ts` | Participant queries |
| `src/modules/athletes/hooks.ts` | Participant hooks |
| `src/modules/athletes/components/ParticipantsPanel.tsx` | Roster UI |
| `src/modules/auth/types.ts` | Profile types |
| `src/modules/auth/api.ts` | Profile queries |
| `src/modules/auth/hooks.ts` | Profile + role hooks |
| `src/modules/admin/types.ts` | Admin types |
| `src/modules/admin/api.ts` | Admin queries |
| `src/modules/admin/hooks.ts` | Admin hooks |
| `src/modules/admin/components/*.tsx` | Moved super admin components |

### Modified Files (~12)

| File | Change |
|---|---|
| Migration SQL | New tables, DOB column, realtime, `has_competition_access` override |
| `src/App.tsx` | Remove SubscriptionGuard wrappers |
| `src/hooks/useSubscription.ts` | V1_FULL_ACCESS bypass |
| `src/pages/CompetitionDashboard.tsx` | Layout-only shell using module hooks |
| `src/pages/CompetitionList.tsx` | Use `useCompetitions()` hook |
| `src/pages/CompetitionCreate.tsx` | Use `useCreateCompetition()` mutation |
| `src/pages/CompetitionWorkouts.tsx` | Use tournament hooks |
| `src/pages/MainMenu.tsx` | V1 full access rendering |
| `src/pages/CreateProfile.tsx` | DOB field |
| `src/pages/ViewProfile.tsx` | DOB field |
| `src/components/CompetitionHeader.tsx` | V1 flag hides badge |
| `src/lib/validation.ts` | Add DOB schema |

### Preserved (no changes)

- All `src/components/ui/` files
- `src/components/AuthProvider.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/integrations/supabase/client.ts` and `types.ts`
- Edge functions
- Existing RLS policies (they still reference `is_competition_owner`, `is_competition_judge` -- those remain unchanged)

---

## Execution Order

1. Database migration (new tables, DOB, realtime, `has_competition_access` override)
2. Create `src/lib/featureFlags.ts`
3. Create all module `types.ts` files
4. Create all module `api.ts` files
5. Create all module `hooks.ts` files
6. Create module components (refactored panels + MobileJudgeScoring)
7. Refactor pages to use modules (CompetitionDashboard, List, Create, Workouts)
8. Apply V1_FULL_ACCESS to subscription/menu/header/routes
9. Add DOB to profile pages
10. Clean up old data/ files as re-exports, remove dead code

