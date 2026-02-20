

# Enterprise Competition Platform V2 -- Implementation Plan

This is a 4-phase sequential upgrade. No billing, stripe, entitlement, region routing, auth, or profile logic will be touched.

---

## Phase 1: Database Foundation (Single Migration)

One large SQL migration covering all schema changes, functions, triggers, RLS policies, indexes, and realtime.

### Critical Column Name Corrections

The spec references `s.points` and `t.name` but the actual schema uses `s.score` and `t.team_name`. All SQL below uses the correct existing column names.

### New Tables

| Table | Purpose |
|---|---|
| `super_users` | Max 2 platform admins (manual DB insert only) |
| `competition_divisions` | First-class division entities per competition |
| `competition_participants` | Athletes registered to teams |
| `competition_judges` | Judge assignments per competition |
| `scoring_events` | Immutable audit trail for score changes |
| `seasons` | Championship season containers |
| `season_competitions` | Links competitions to seasons |

### Altered Tables

| Table | Change |
|---|---|
| `competition_teams` | Add `division_id UUID REFERENCES competition_divisions(id) ON DELETE SET NULL` |
| `competition_scores` | Add `judge_id UUID`, `locked BOOLEAN DEFAULT false`, `locked_at TIMESTAMPTZ` |
| `competition_workouts` | Add `is_locked BOOLEAN DEFAULT false` |
| `competitions` | Add `season_id UUID REFERENCES seasons(id) ON DELETE SET NULL` |

### Functions

| Function | Type |
|---|---|
| `limit_super_users()` | Trigger function -- raises exception if count >= 2 |
| `is_super_user(UUID)` | SECURITY DEFINER -- returns boolean, used in all RLS |
| `is_competition_owner(UUID, UUID)` | SECURITY DEFINER -- checks competitions.created_by |
| `is_competition_judge(UUID, UUID)` | SECURITY DEFINER -- checks competition_judges |
| `log_score_event()` | Trigger function -- inserts into scoring_events on score insert/update |
| `get_competition_leaderboard(UUID)` | RPC -- returns division_id, division_name, team_id, team_name, total_points using `SUM(s.score)` |
| `get_season_leaderboard(UUID)` | RPC -- aggregates scores across all competitions in a season |

### Triggers

| Trigger | Table | Event |
|---|---|---|
| `enforce_super_user_limit` | `super_users` | BEFORE INSERT |
| `score_audit_trigger` | `competition_scores` | AFTER INSERT OR UPDATE |

### RLS Policies (all include `OR is_super_user(auth.uid())`)

**super_users**: No RLS policies for normal users (manual DB management only). SELECT allowed for authenticated (needed by `is_super_user` function which is SECURITY DEFINER, so actually no direct RLS needed -- table accessed only via the function).

**competition_divisions**:
- SELECT: authenticated
- INSERT/UPDATE/DELETE: competition owner OR super_user

**competition_participants**:
- SELECT: authenticated
- INSERT: competition owner OR self-registration (user_id = auth.uid()) OR super_user
- UPDATE/DELETE: competition owner OR super_user

**competition_judges**:
- SELECT: authenticated
- INSERT/DELETE: competition owner OR super_user

**scoring_events**:
- SELECT: authenticated
- No INSERT/UPDATE/DELETE (trigger-only)

**seasons + season_competitions**:
- SELECT: authenticated
- INSERT/UPDATE/DELETE: super_user only

**Updated competition_scores** (existing policies replaced):
- SELECT: authenticated (unchanged)
- INSERT: owner OR judge (if workout not locked) OR super_user
- UPDATE: owner OR judge (if workout not locked AND score not locked) OR super_user
- DELETE: owner OR super_user

### Indexes

```text
competition_divisions (competition_id)
competition_participants (competition_id, team_id)
competition_judges (competition_id, user_id)
scoring_events (competition_id, team_id)
competition_scores (competition_id, team_id)
competition_teams (competition_id, division_id)
competitions (season_id)
```

### Realtime

Enable for: `competition_scores`, `competition_participants`, `scoring_events`

---

## Phase 2: Domain Layer, Data Layer, and Hooks

### Domain Layer (`src/domain/`) -- Pure TypeScript interfaces, no imports

| File | Interfaces |
|---|---|
| `competition.ts` | Competition, Division, Team, Workout, Participant |
| `scoring.ts` | Score, ScoringEvent, LeaderboardEntry, SeasonRanking |
| `judges.ts` | Judge, CompetitionRole |
| `superAdmin.ts` | SuperUser |
| `season.ts` | Season, SeasonCompetition, SeasonLeaderboardEntry |

### Data Layer (`src/data/`) -- All database queries centralized here

| File | Functions |
|---|---|
| `leaderboard.ts` | `fetchCompetitionLeaderboard(id)` via RPC, `fetchSeasonLeaderboard(id)` via RPC |
| `judges.ts` | CRUD for competition_judges |
| `divisions.ts` | CRUD for competition_divisions |
| `participants.ts` | CRUD + self-registration for competition_participants |
| `scoring.ts` | Score upsert with judge_id, lock/unlock workout, lock/unlock individual scores |
| `superAdmin.ts` | Check super_user status, fetch all competitions, reassign ownership |

### New Hooks

| Hook | Purpose |
|---|---|
| `src/hooks/useSuperUserAccess.ts` | Queries `super_users` via `is_super_user` RPC or direct check; exposes `isSuperUser: boolean`. Returns `false` silently for non-super users. No UI indicators. |
| `src/hooks/useCompetitionRole.ts` | Returns `{ isOwner, isJudge, role }` for current user + competition. Checks `competitions.created_by` and `competition_judges`. |
| `src/hooks/useLeaderboard.ts` | Calls `get_competition_leaderboard` RPC, subscribes to realtime `competition_scores` for auto-refresh. |
| `src/hooks/useSeasonLeaderboard.ts` | Calls `get_season_leaderboard` RPC. |

---

## Phase 3: Competition Dashboard Rebuild

### Role-Based Tab Visibility

```text
Owner:       Setup | Judges | Scores | Leaderboard | Roster | Overview
Judge:       Scores | Leaderboard | Roster
Viewer:      Leaderboard | Roster | Overview
Super User:  All tabs + override controls (unlock buttons, edit any field)
```

### Access Logic

```text
const { isOwner, isJudge } = useCompetitionRole(competitionId);
const { isSuperUser } = useSuperUserAccess();
const canAdmin = isOwner || isSuperUser;
const canScore = isOwner || isJudge || isSuperUser;
```

### New Components

| Component | Purpose |
|---|---|
| `DivisionsPanel.tsx` | CRUD for divisions in Setup tab (owner/super_user only) |
| `JudgesPanel.tsx` | Assign/remove judges by email lookup (owner/super_user only) |
| `ParticipantsPanel.tsx` | "Roster" tab -- owner adds athletes, viewers self-register to teams |
| `ScoreLockControls.tsx` | Per-workout lock toggle (owner); emergency unlock (super_user only) |

### Modified Components

| Component | Changes |
|---|---|
| `TeamsPanel.tsx` | Replace free-text division input with dropdown from `competition_divisions`; add `division_id` on insert |
| `ScoresPanel.tsx` | Respect `is_locked` per workout; track `judge_id` on submit; show lock indicators; save via data layer |
| `LeaderboardPanel.tsx` | Call RPC `get_competition_leaderboard` instead of client-side aggregation; group by division |
| `WorkoutsPanel.tsx` | Show lock indicator per workout; owner can toggle lock |
| `CompetitionDashboard.tsx` | Load divisions + judges; use `useCompetitionRole` + `useSuperUserAccess`; render role-based tabs |

---

## Phase 4: Super User Dashboard + Seasons

### New Route: `/super-dashboard`

- Added to `App.tsx` behind `ProtectedRoute` + `SuperUserGuard`
- `SuperUserGuard` silently redirects non-super users to `/dashboard`
- NOT linked from any normal navigation -- no menu item, no badge, no mention

### New Pages/Components

| File | Purpose |
|---|---|
| `src/pages/SuperDashboard.tsx` | Main layout with dedicated nav |
| `src/components/super/CompetitionManager.tsx` | Browse/search/edit all competitions, reassign ownership |
| `src/components/super/SeasonManager.tsx` | Create/manage seasons, assign competitions to seasons |
| `src/components/super/AuditLog.tsx` | View scoring_events with filters |
| `src/components/super/ScoreOverride.tsx` | Emergency unlock + score modification |
| `src/components/super/SuperUserGuard.tsx` | Route guard component |

### Season UI in Normal Dashboard

- If a competition belongs to a season, show a season badge on the competition list
- Season leaderboard accessible from competition list for all authenticated users

### Updated `App.tsx`

Add route: `/super-dashboard` with `ProtectedRoute` + `SuperUserGuard` wrapping `SuperDashboard`

---

## Files Summary

| File | Type |
|---|---|
| Migration SQL | NEW |
| `src/domain/competition.ts` | NEW |
| `src/domain/scoring.ts` | NEW |
| `src/domain/judges.ts` | NEW |
| `src/domain/superAdmin.ts` | NEW |
| `src/domain/season.ts` | NEW |
| `src/data/leaderboard.ts` | NEW |
| `src/data/judges.ts` | NEW |
| `src/data/divisions.ts` | NEW |
| `src/data/participants.ts` | NEW |
| `src/data/scoring.ts` | NEW |
| `src/data/superAdmin.ts` | NEW |
| `src/hooks/useSuperUserAccess.ts` | NEW |
| `src/hooks/useCompetitionRole.ts` | NEW |
| `src/hooks/useLeaderboard.ts` | NEW |
| `src/hooks/useSeasonLeaderboard.ts` | NEW |
| `src/components/competition/DivisionsPanel.tsx` | NEW |
| `src/components/competition/JudgesPanel.tsx` | NEW |
| `src/components/competition/ParticipantsPanel.tsx` | NEW |
| `src/components/competition/ScoreLockControls.tsx` | NEW |
| `src/components/competition/TeamsPanel.tsx` | MODIFIED |
| `src/components/competition/ScoresPanel.tsx` | MODIFIED |
| `src/components/competition/LeaderboardPanel.tsx` | MODIFIED |
| `src/components/competition/WorkoutsPanel.tsx` | MODIFIED |
| `src/pages/CompetitionDashboard.tsx` | MODIFIED |
| `src/pages/SuperDashboard.tsx` | NEW |
| `src/components/super/CompetitionManager.tsx` | NEW |
| `src/components/super/SeasonManager.tsx` | NEW |
| `src/components/super/AuditLog.tsx` | NEW |
| `src/components/super/ScoreOverride.tsx` | NEW |
| `src/components/super/SuperUserGuard.tsx` | NEW |
| `src/App.tsx` | MODIFIED |

---

## What Will NOT Change

- All billing tables (billing_customers, billing_providers, billing_regions, etc.)
- Stripe edge functions (create-checkout-session, stripe-webhook)
- Subscription entitlement schema (user_subscriptions, pricing_tiers, tier_prices)
- Region routing tables
- Authentication flow (AuthProvider, ProtectedRoute)
- Profile management (profiles table, useProfile hook, CreateProfile/ViewProfile pages)
- useSubscription hook
- MainMenu page

---

## Security Guarantees

- Max 2 super users enforced by database trigger (cannot be bypassed from frontend)
- Super users completely invisible to normal UI (no link, no badge, no mention)
- `is_super_user()` is SECURITY DEFINER -- bypasses RLS safely, no recursion
- Score locking enforced at RLS level -- frontend lock is cosmetic, database is authoritative
- Judges scoped to assigned competitions only via RLS
- Leaderboard computed server-side via RPC -- zero client aggregation
- Scoring events are immutable (no UPDATE/DELETE policies)
- All competition write operations check ownership OR super_user at database level

