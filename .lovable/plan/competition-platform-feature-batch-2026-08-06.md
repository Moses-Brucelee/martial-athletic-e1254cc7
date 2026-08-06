# Competition Platform — Feature Batch

Ten enhancements plus a heat whiteboard bug fix. Existing behaviour stays intact unless listed below.

## 1. Workout video links
- Add a video link field to each workout (and keep the existing per-movement video field).
- Athletes and organisers see a "Watch demo" control on the workout card. YouTube/Vimeo links play in an in-app modal player; anything else opens externally through the existing external-link warning dialog.

## 2. Tie breaker setup
- Surface the tie-breaker choice in competition settings: best final workout, best single workout placement, or earliest submission.
- Apply the selected policy when ranking equal totals, and label the tie-broken rows on the leaderboard.

## 3. Placement points scoring (lower is better)
- Add a per-competition scoring model toggle: "Placement points" (1st = 1 pt, 2nd = 2 pts, lowest total wins) or the current points model.
- When placement points are on, the leaderboard sorts ascending by total and shows per-workout placement instead of awarded points. Score capture is unchanged — placements are derived.

## 4. Full heats view
Already delivered (whiteboard with all heats/times/teams/judges plus PNG/JPEG download). Bug fixes below.

## 5. Notifications for owners/admins
- In-app notification centre (bell in the header with unread count) plus an email to the gym owner / competition organiser.
- Triggers: a new affiliate/member request or sign-up for their gym, and a new registration on one of their competitions.
- Emails are branded and go through the existing email pipeline; each notification links to the relevant page.

## 6. Delete a competition
- Owner and super users get a Delete action on the competition dashboard, behind a type-the-name confirmation.
- Deletion removes the competition and its dependent records (teams, registrations, workouts, heats, scores).

## 7. Disable the advanced competition creator
- The Advanced setup option is hidden behind a feature flag (default off), so every new competition uses Quick setup. Super users can re-enable it from the flags admin. Existing advanced competitions keep working.

## 8. Solo divisions on the heat sheet
- When a division has a team size of 1, heat lanes can be filled with individual athletes directly instead of requiring a team wrapper.
- The lane assigner shows approved solo athletes for those divisions; the whiteboard prints the athlete's name in the lane.

## 9. Team size enforcement when adding teams
- Creating a team in the dashboard reads the division's team size and caps the member slots to that number.
- Full teams are marked complete and excluded from the "add member" team picker, with a clear "Full" indicator instead of disappearing silently.

## 10. Gender in the unassigned athlete list
- The unassigned athlete list in the add-members dialog shows a gender badge (M/F/other) and can be filtered by gender.

## Bug: heat whiteboard lanes
Two confirmed causes in the whiteboard code:
- Lane columns use one global maximum lane count for every table instead of each heat's own lane count, so heats render the wrong number of lanes.
- Lane placement relies on the stored lane number, but assignments made without an explicit lane have none, so those teams never land in a column.

Fix: render lane columns per workout group based on the heats in that group, and give unnumbered assignments a stable fallback lane (first free slot in order) so every assigned team appears. Judges will be shown per lane from the actual heat-judge records rather than the current round-robin approximation.

## Technical notes
- Schema: `competition_workouts.video_url`; `competition_settings.scoring_model`; `heat_assignments.athlete_registration_id` (nullable, for solo lanes) with `team_id` made nullable; a `notifications` table with per-user RLS and grants.
- Tie breaker and ranking already exist as `competition_settings.tie_breaker_policy` / `ranking_direction`; the plan wires them into the leaderboard UI and the ranking functions (`get_competition_leaderboard`, `recompute_workout_rankings`).
- Notification fan-out runs in a database trigger enqueueing an app email plus an in-app row; a new app email template is registered and the send function redeployed.
- Delete uses cascading foreign keys where present plus an RLS-guarded delete policy limited to the owner and super users.
- Advanced creator gating reuses the existing feature flag system (`FeatureGate`).
