This is a large multi-area change set. I've grouped the 12 items into 4 logical phases so you can confirm scope, order, and any trade-offs before I start. Nothing is built yet.

## Phase 1 — Permissions & Visibility (items 1, 8, 9, 11)

**Affiliate competition creation (1)**

- In `CompetitionCreate.tsx` (StepDetails), auto-select and lock `gym_id` to the affiliate's active gym membership. Hide gym picker for non-super-users.
- Add DB-level guard: RLS policy on `competitions` INSERT requires `gym_id` matches a gym the user owns OR an active `gym_members` row OR `is_super_user`.
- Super-users keep full picker.

**Unpublished competition visibility (8)**

- Update `competitions` SELECT RLS so non-owner / non-super viewers only see rows where `status != 'draft'` AND `status != 'unpublished'`. Same-affiliate members without management role get no special bypass.
- Filter `CompetitionList`, `Browse`, public landing, dashboard spotlights accordingly.

**Leaderboard & Heats before live (9)**

- In `CompetitionDashboard.tsx` tab list, hide Leaderboard + Heats tabs unless `derivedStatus === 'live' || 'completed'`. Owners/judges keep access via a "Preview" toggle.
- Public landing (`CompetitionPublic.tsx`) hides the same sections pre-live.

**Workout visibility (11)**

- Viewer/public side: render only workouts with `visibility = 'visible'` (drop "hidden" + un-revealed "scheduled").
- Remove the duplicate "WORKOUTS" admin panel from the Viewer experience — keep only the "ATHLETE VIEW" card. Tighten spacing.

## Phase 2 — Date/Time Validation & UX (items 3, 4, 5)

**Same-day & 1-month rule (3)**

- Replace current Zod date schema in `lib/validation.ts` with full datetime comparison:
  - `end_datetime > start_datetime`
  - `end_datetime <= start_datetime + 1 month`
- Allow same calendar day when end time > start time.

**Registration deadline (4)**

- Add `registration_deadline < start_datetime` check.
- In wizard: disable the deadline picker until start datetime is set; restrict its max to `start_datetime - 1 min`. Recompute when start changes.

**Inline validation messaging (5)**

- Move all wizard errors from top banner to per-field `<FormMessage>` slots using `react-hook-form` + zod resolver (already in deps).
- Trigger on blur, not on keystroke. Disable Next button while form invalid.
- Where possible (date pickers), restrict selectable range instead of post-hoc error.

## Phase 3 — Registration Lifecycle & Pre-population (items 2, 10)

**Pre-populate private competition venue (2)**

- On wizard mount, if `visibility === 'private'` and creator has gym/profile address, pre-fill `venue`, `host_gym`, location fields. Keep editable.

**Registration availability (10)**

- Compute `registrationOpen = now < registration_deadline`.
- Dashboard tabs (athlete/viewer mode):
  - Open: show Registration (with team create/manage/members), Workouts, Teams.
  - Closed: hide Registration tab; show banner "Registrations for this competition have closed. Please contact the competition administrator for assistance."
- Disable team create/edit/member add/remove mutations on the client and add RLS check: `competition_teams` write policies require `now() < registration_deadline` (owner/super bypass).
- This change should also apply to the public shared url like even there they should not be able to make changes once deadline is passed, they should see registration deadline passed or closed something like that, once competition is completed on the public url should redirect to login and ask them to login to view the leaderboard teams etc basically they will be directed to the competition page event page should redirect to competition page and competition page is under login right  


## Phase 4 — Sponsor Links & Teams UI (items 6, 7, 12)

**Sponsor click + external warning (6, 7)**

- Restore `<a>` wrapper / onClick on sponsor logos in `CompetitionPublic.tsx`.
- Add `ExternalLinkConfirmDialog` component: shows destination URL, Cancel / Continue buttons. Continue opens `target="_blank" rel="noopener noreferrer"`.
- Still calls `increment_sponsor_click` RPC for analytics.

**Teams & Members redesign (12)**

- New `TeamsLeaderboardView` in public/viewer dashboard:
  - Card per team, leaderboard-style ranking (current standing if live, else by registration order).
  - Team name header, division badge, captain marker, member avatars + names listed below.
  - Responsive: 1 col mobile, 2 col tablet, 3 col desktop.
  - Smooth hover, expandable member list on mobile.

## Technical notes

- DB migrations needed: competitions RLS (visibility), competition_teams RLS (deadline lock), gyms/competitions INSERT policy (affiliate scoping).
- Validation centralised in `src/lib/validation.ts` so wizard + edit-panel share rules.
- No business-logic change to scoring or leaderboard computation.
- Will keep super-user override on every new restriction.

## Suggested execution order

I'd ship in this phase order so each step is testable independently. Estimated effort is largest in Phase 1 (RLS + tab logic) and Phase 4 (Teams redesign).

**Questions before I start:**

1. For affiliate-scoping (item 1): if a user belongs to multiple gyms, should the wizard let them pick from their gyms only, or always lock to their "primary" gym? allow to pick from their gyms
2. For item 9, should competition **owners** (when previewing their own draft) still see Leaderboard/Heats tabs, or fully hidden until live? nothing changes for competition owners that stays same
3. For item 12, do you want team ranking by current leaderboard points (when live), or alphabetical / registration order pre-live?   
When live, it should be in sync with the current leaderboard.   
pre-live registration order