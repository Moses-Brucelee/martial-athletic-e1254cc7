

# Subscription Enforcement Hardening Plan

The audit revealed that subscription enforcement exists only as a UI gate in MainMenu.tsx. Free-tier users can bypass it entirely by navigating directly to URLs. This plan closes all gaps across three enforcement layers.

---

## Gap Summary

| Layer | Currently Enforced? |
|---|---|
| MainMenu navigation | Yes (UI-only cosmetic gate) |
| Route/page-level guards | No |
| Component mutation buttons | No |
| Data layer mutations | No |
| RLS policies (database) | No |

A Free user can type `/competition/create` and create competitions. Once they own one, all child operations (teams, workouts, scores, divisions, judges) succeed because RLS only checks ownership.

---

## Fix Strategy: Three-Layer Enforcement

### Layer 1: Database RLS (Authoritative)

Create a SECURITY DEFINER function that checks whether a user has an active paid subscription:

```text
Function: has_competition_access(p_user_id UUID) -> BOOLEAN
  Returns TRUE if:
    - User has an active row in user_subscriptions with a tier key of
      'affiliate_pro' or 'tournament_pro'
    - OR user is a super_user
  Returns FALSE otherwise (Free tier)
```

Update RLS INSERT policy on `competitions` table:

```text
Current:  auth.uid() = created_by
New:      auth.uid() = created_by AND has_competition_access(auth.uid())
```

Update RLS INSERT/UPDATE/DELETE policies on:
- `competition_teams`
- `competition_workouts`
- `competition_divisions`
- `competition_judges`
- `competition_participants` (owner operations only, not self-registration)

From:
```text
is_competition_owner(auth.uid(), competition_id) OR is_super_user(auth.uid())
```
To:
```text
(is_competition_owner(auth.uid(), competition_id) AND has_competition_access(auth.uid()))
OR is_super_user(auth.uid())
```

`competition_scores` INSERT/UPDATE similarly updated to require `has_competition_access` for owner/judge paths (super_user bypass preserved).

This ensures that even if all frontend guards fail, the database rejects mutations from Free users.

### Layer 2: Route/Page Guards

Create a new component: `src/components/SubscriptionGuard.tsx`

```text
Props: { requiredFeature: string; children: ReactNode }
Logic:
  - Uses useSubscription().canAccess(requiredFeature)
  - If loading: show spinner
  - If not allowed: redirect to /upgrade
  - If allowed: render children
```

Update `App.tsx` routes:

```text
/competition/create     -> ProtectedRoute -> SubscriptionGuard(create_competitions) -> CompetitionCreate
/competition/:id/workouts -> ProtectedRoute -> SubscriptionGuard(create_competitions) -> CompetitionWorkouts
```

The `/competition/:id` (dashboard) route stays open because viewers (Free tier) should still see leaderboards and rosters. The write controls inside are gated at Layer 3.

### Layer 3: Component-Level Checks

Update `CompetitionDashboard.tsx`:

```text
Current:  const canAdmin = isOwner || isSuperUser;
New:      const { canAccess } = useSubscription();
          const canAdmin = (isOwner && canAccess('create_competitions')) || isSuperUser;
          const canScore = ((isOwner || isJudge) && canAccess('create_competitions')) || isSuperUser;
```

This means a Free-tier user who somehow owns a competition (legacy data or direct DB insert) will see the Viewer tabs only -- no Setup, no Scores, no Judges tabs.

The `isOwner` boolean passed as `canAdmin`/`isOwner` prop to child components (TeamsPanel, WorkoutsPanel, DivisionsPanel, JudgesPanel, ScoresPanel) will now be `false` for Free users, hiding all add/edit/delete buttons.

---

## Files Changed

| File | Type | Change |
|---|---|---|
| SQL Migration | NEW | `has_competition_access()` function + updated RLS policies |
| `src/components/SubscriptionGuard.tsx` | NEW | Route-level subscription gate component |
| `src/App.tsx` | MODIFIED | Wrap competition create/workouts routes with SubscriptionGuard |
| `src/pages/CompetitionDashboard.tsx` | MODIFIED | Add `useSubscription` to `canAdmin`/`canScore` logic |

---

## What Will NOT Change

- Billing tables, Stripe logic, edge functions
- `useSubscription` hook (already correct)
- `MainMenu.tsx` (already gated correctly)
- Super user bypass (preserved at all layers)
- Judge score submission (still allowed if they have paid tier via their own subscription or are explicitly assigned)
- Viewer access to leaderboards and rosters (Free users can still view)
- Profile management, authentication flow

---

## Security Result After Fix

| Attack Vector | Before | After |
|---|---|---|
| Free user navigates to `/competition/create` | Creates competition | Redirected to /upgrade |
| Free user POSTs to competitions table via API | Insert succeeds | RLS rejects |
| Free owner accesses Setup tab | Full admin controls shown | Viewer-only tabs shown |
| Free owner submits scores via data layer | Upsert succeeds | RLS rejects |
| Super user on Free tier | Blocked | Bypasses (correct) |

