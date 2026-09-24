# Competition Navigation and Guided Workflow

## Goal

Replace the fragmented competition navigation with one clear, freely navigable workflow:

```text
Overview → Workouts → People → Heats → Scoring → Leaderboard
```

The current section remains visually selected. A separate, subtle “Next” marker identifies the recommended section without disabling any section.

## 1. Consolidate the navigation

- Use the six labels above for competition owners and super-users in both quick and advanced competition modes.
- Rename **Scores** to **Scoring** everywhere in this competition navigation.
- Replace **Command** with **Overview**.
- Keep every existing management tool by moving current content into the closest workflow section:
  - **Overview:** command-centre summary, competition details, status controls, divisions, poster and competition settings.
  - **Workouts:** existing workout management.
  - **People:** athletes, teams, registrations, roster and judge management.
  - **Heats:** heat management and bracket management where applicable.
  - **Scoring:** score capture, validation and score-lock controls.
  - **Leaderboard:** existing standings, breakdown and whiteboard views.
- Preserve the simpler role-appropriate navigation for judges and participants; only rename Scores to Scoring where it appears.

## 2. Derive the recommended destination

Add one pure workflow helper that uses the already-loaded competition status, workouts, registrations/teams, heats and scores. It will not create new database state or duplicate lifecycle rules.

Recommended destination:

- Draft with no workouts → **Workouts**.
- Draft with workouts but no ready entrants → **People**.
- Draft with entrants but no heats → **Heats**.
- Draft with required setup complete → **Overview**, ready to publish.
- Published before the event → **Heats** when heat setup is incomplete; otherwise **Overview**.
- Live with score capture incomplete or underway → **Scoring**.
- Live with all expected results captured → **Leaderboard**.
- Completed or expired → **Leaderboard**.

Readiness will use approved/eligible registrations and teams rather than treating every raw registration as competition-ready. Score completion will compare the actual eligible entrants and scoreable workouts, including solo-athlete competitions.

## 3. Make guidance useful but non-blocking

- Control the active section in the dashboard so the recommended destination opens automatically on first visit.
- Respect a valid `?tab=` link and keep the user on any section they deliberately select, including while scores update live.
- Never disable completed or earlier sections.
- Clicking a next-action button changes the active section immediately; publishing continues to use the existing confirmation and readiness checks.

## 4. Add the contextual next action

Place one compact next-action strip beneath the competition status area:

- `Next: Create Workouts` → **Create Workouts**
- `Next: Add People / Teams` → **Manage People**
- `Next: Configure Heats` → **Manage Heats**
- `Competition Ready` → **Publish Competition** using the existing confirmation flow
- `Competition Live` → **Go to Scoring**
- `Scores Complete` → **View Leaderboard**

Do not show a redundant action once its stage is complete. The existing standalone status-change panel will be integrated into this strip rather than duplicated.

## 5. Navigation presentation

- Use one evenly spaced navigation row on desktop, with a strong selected state and a small “Next” label on the recommended section.
- Use a horizontally scrollable row on mobile with 44px minimum touch targets; automatically bring the selected/recommended section into view.
- Remove the current uneven stretched-tab appearance while retaining the existing dark theme, red accent and typography.

## Technical details

- Refactor `CompetitionDashboard.tsx` to use a controlled tab value and a single owner navigation definition.
- Add a small pure workflow helper and focused unit tests for every status/readiness case, including teams, solo athletes, partial scores and completed competitions.
- Extend `CompetitionStatusActions` so its existing validated confirmation dialog can be triggered by the new next-action strip; do not duplicate publishing logic.
- Reuse existing query hooks and cached data. No schema, scoring, ranking, scheduling or registration-rule changes.
- Verify owner, super-user, judge and participant views at desktop and mobile widths, plus direct `?tab=` navigation and live score updates.
