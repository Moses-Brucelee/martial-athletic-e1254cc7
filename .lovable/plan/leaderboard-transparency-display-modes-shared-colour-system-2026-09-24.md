# Leaderboard Transparency, Display Modes & Shared Colour System

UI-only changes. No changes to scoring, ranking, tie-breaker rules, heats, lanes, judges or registration.

## 1. Tie breaker badges on the leaderboard

- For each group of teams with equal total points, check whether the existing global tie breaker (`most_wins_placements`) actually separated them, using the same comparison already in the ranking engine (no new ranking logic).
- Only teams in a tie that the tie breaker split get a small badge, e.g. `TB: 3 wins` (plus 2nd/3rd counts in the tooltip if wins are equal).
- Per-workout cells: when two teams have equal primary result and the workout's time tie breaker ordered them, show `TB: 08:42` under that cell.
- Tooltip: "Tie breaker applied to resolve equal primary scores."
- Shown in Standings, Workout Breakdown and Whiteboard views.
- When tie breaker is enabled and applied

## 2. Colour / Black & White toggle

- Segmented toggle `[ Colour ] [ Black & White ]` in the leaderboard header and whiteboard toolbar; default Colour, choice remembered in the browser.
- B&W mode applies a wrapper class that swaps to black/white/grey with red accent only: medal colours replaced by bold rank numbers + border weight for top 3, no tinted backgrounds. Also applies to image downloads.
- Same single leaderboard component — no duplicate implementation.

## 3. Shared colour system

- Replace the 10-hue workout palette with a restrained set built from red, neutral greys and white/black shades (varying lightness + a numbered label so workouts stay distinguishable without rainbow colours).
- Automatically carries through Heat Management, Heat Whiteboard, score entry and athlete table, which already use this shared helper.
- Leaderboard medal colours (yellow/grey/amber) replaced by red / foreground / muted tokens. Green/amber kept only for status/warning states.

## 4. Readability in B&W

- Ranking conveyed through typography weight, borders and rank numbers, not colour alone; TB badges use outlined style.

## 5. Expandable saved workout cards

- In the quick workouts list, saved workouts render as collapsible cards.
  - Collapsed: name, type, short summary, expand chevron.
  - Expanded: full description, movements, reps/rounds, time cap, scoring type, tie breaker, video/other details.
- Edit and delete buttons remain unchanged.

## Technical details

- New pure helper `src/domain/tieBreakerDisplay.ts`: given leaderboard entries + scores + settings, returns `{ teamId -> label }` and `{ teamId::workoutId -> label }`, reusing `compareGlobalStandings` / existing workout comparators from `src/domain/engine.ts`. Unit tests added.
- `src/modules/leaderboard/components/LeaderboardPanel.tsx`: badges, toggle (localStorage key `ma-leaderboard-display`), `data-display="bw"` styling via semantic tokens in `index.css`.
- `src/lib/workoutColors.ts`: new neutral/red palette, same API.
- `QuickWorkoutsPanel.tsx`: wrap saved tile in shadcn `Collapsible`.
- No database changes.