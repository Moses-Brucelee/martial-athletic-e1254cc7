# Big PR — 4 features in one pass

## 1. Free / public viewer dashboard (4 tabs only)

**Where:** `src/pages/CompetitionDashboard.tsx`

- Compute `isViewer = !isOwner && !isJudge && !isSuperUser`.
- When `isViewer`, render only 4 tabs: **Leaderboard · Heats · Team Overview · Workouts** (workouts respect existing `visibility` rule: `visible` or `scheduled` past reveal time).
- "Team Overview" = read-only list of teams + their athletes per division (reuse `TeamsListView` in read-only mode).
- Owners / judges / super-users keep the full tabset they have today.

## 2. Affiliates + Public/Private competitions

**Model decision:** "Affiliate" = a `gyms` row owned by an Affiliate-Pro tier user. No new table needed.

**Migration:**

- `competitions.visibility` text default `'public'` check in (`public`,`private`).
- `competitions.gym_id` uuid null (which affiliate "owns" the competition for private mode).
- Update `competitions_select` RLS so a `private` comp is visible only to: owner, super-user, judges, registered athletes, **or** members of that gym (`gym_members` where `gym_id = competitions.gym_id AND user_id = auth.uid()`).
- `gyms` already has an "invite member by email" surface via members management — extend `MembersPage` with an **Invite by email** dialog that inserts a `gym_member_invitations` row (new tiny table: `gym_id, email, invited_by, accepted_at`). On signup, if email matches an open invite, auto-add to `gym_members`. For now: create the table + invite form + accept-on-login hook.

**UI:**

- Profile / signup: a new dropdown "Affiliate (optional)" populated from `gyms` (public list). Saves to `gym_members` on selection.
- Competition create wizard StepDetails: add a **toggle bar** "Public ↔ Private" (matches sample style). When Private, show a small caption "Only your affiliate members will see this competition." Owner's `gym_id` auto-fills (first owned gym).
- Competition dashboard header: small badge "Private — {Gym name}" when private.

## 3. Guest judges + heat assignment

**Migration:**

- `competition_judges.user_id` → nullable.
- `competition_judges.display_name` text null.
- CHECK: `(user_id is not null) OR (display_name is not null)`.
- New join table `heat_judges (id, heat_id, judge_id, created_at)` with RLS: owner/super can manage, all auth can select.
- when user is typing search through the userbase and list suggestions specifically belong to same affliciate  


**UI:** `JudgesPanel`

- New "Add by name" input next to existing search → creates row with only `display_name`.
- Judge row gains a heats multi-select dropdown (similar to team→heat/lane assignment) to write `heat_judges`.

## 4. Heats — more descriptive UI

**Where:** `src/modules/tournaments/components/HeatManagementPanel.tsx` (+ `HeatLaneAssigner`).

Redesign per attached sample, but cleaner:

- Group by **workout** with a left red accent bar + workout name + heat count chip.
- Each heat = collapsible card: heat #, time, status chip (Scheduled / Live / Done).
- Lanes shown as 2-col grid of "Team chip · captain name · assigned judge chip".
- Judge chip uses the new `heat_judges` data; inline dropdown to change.
- Side rail: small clickable list of other heats (compact summary).

## Tech details

- Hooks: extend `useCompetitionRole` to expose `isViewer`.
- Visibility computation: server-side via RLS; client just filters tabs.
- Affiliates dropdown source: `select id, name from gyms order by name`.
- Invite-on-signup: edge call in `Register.tsx` after successful sign-in, or DB trigger on `auth.users` insert that scans `gym_member_invitations` by email. Use trigger (cleaner).
- All new validation via Zod in `src/lib/validation.ts`.

## Order of execution

1. Migration (schema + RLS + invite trigger)
2. Data hooks for visibility/affiliate/heat_judges
3. `CompetitionDashboard` viewer tab gate
4. Create wizard public/private toggle + competition badge
5. Profile/signup affiliate dropdown + members invite UI
6. `JudgesPanel` guest + heat dropdown
7. `HeatManagementPanel` redesign
8. Update memory