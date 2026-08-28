# Heat Lane Team Selection – Division Grouping

## Goal
Group the team-selection dropdown inside **Heat → Lane Assignments** by each team’s assigned division, while keeping every existing lane-assignment behaviour intact.

## Current state
- `src/modules/tournaments/components/HeatLaneAssigner.tsx` renders available teams as a flat list of `SelectItem` elements.
- The `Team` domain type already exposes `division: string | null` and `division_id: string | null`.
- `SelectGroup`, `SelectLabel`, and `SelectSeparator` are exported from the project’s shadcn `select.tsx`.

## Proposed change
1. **Compute grouped teams in `HeatLaneAssigner.tsx`**
   - After filtering `availableTeams`, group them by `team.division`.
   - Teams whose `division` is null/empty/whitespace go into a single fallback group labelled **Other / Unassigned**.
   - Sort division groups alphabetically by division name for stable output.
   - Within each group, keep the existing team sort order.

2. **Render grouped options**
   - Replace the flat `availableTeams.map(...)` with:
     - One `SelectGroup` per division.
     - A styled `SelectLabel` as the division header (distinct background/accent treatment consistent with the Martial Athletic dark theme and workout-colour accents already used in heat panels).
     - `SelectSeparator` between groups for visual clarity.
   - Keep the solo-athlete section below the team groups, unchanged.

3. **Preserve existing behaviour**
   - Keep `value={`team::${t.id}`}` selection keys.
   - Keep `handleAssign`, duplicate-prevention (`assignedTeamIds`, `excludeTeamIds`), athlete counts, and removal logic exactly as today.
   - No changes to team records, divisions, heat logic, lane logic, or scoring.

4. **Mobile/usability**
   - Ensure the dropdown content stays scrollable and touch-friendly (`max-h-96` is already in place).
   - Keep header text concise so narrow viewports remain usable.

## Verification
- Typecheck with `tsgo --noEmit -p tsconfig.app.json`.
- Run the existing test suite to confirm no regressions.
- Visually verify the dropdown in the heat-management panel shows division headers and that selecting/assigning/removing teams still works.

## Out of scope
- No changes to `HeatManagementPanel.tsx`, `AutoHeatGenerator.tsx`, scheduling logic, scoring, registration, or database schema.
- No new dependencies.
