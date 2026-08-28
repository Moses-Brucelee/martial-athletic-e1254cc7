# Consolidate Scoring Tie Breaker Section

Make only this UI/label change to the Competition Scoring & Tie Breakers section.

## What changes

- Remove the separate **Tie Breaker** dropdown currently shown next to **Scoring Model** in `CompetitionSettingsPanel.tsx`.
- Keep **Scoring Model** and **Global Tie Breaker** only.
- Update the **Global Tie Breaker** option descriptions to the exact wording requested:
  - **No global tie breaker** — "Teams with the same overall score remain tied and share the applicable position."
  - **Most wins, then top placements** — "When teams are tied on the overall score: Most 1st-place finishes wins. If still tied, compare the number of 2nd-place finishes. Then 3rd-place finishes, and so on."
- Adjust the grid layout so the remaining two fields stack cleanly inside the existing card (preserve label, select, description, and card styling).

## What stays the same

- Scoring model values, labels, and save behavior (`points` / `placement`, plus `ranking_direction`).
- Global tie breaker values (`none` / `most_wins_placements`) and save behavior.
- Workout-level tie breaker controls in the workout editor.
- The `tie_breaker_policy` database column and existing data are left untouched; the field is simply no longer exposed in this UI.
- Danger zone and all other competition settings behavior.

## Files touched

- `src/modules/tournaments/components/CompetitionSettingsPanel.tsx` — remove legacy tie breaker constant/state/select, update Global Tie Breaker descriptions, adjust layout.

## Out of scope

- No database migrations.
- No changes to scoring calculations, leaderboards, workout tie breakers, or unrelated pages.
