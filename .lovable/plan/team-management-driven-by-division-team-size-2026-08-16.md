# Team management driven by division team size

Teams only make sense when a division allows more than one athlete. Right now the Teams sub-tab and the Create Team dialog show up even when every division is solo (team size 1), which is confusing.

## What changes

1. **Hide the Teams sub-tab when no division supports teams**
   - In the People tab, check the competition's divisions: if none has a team size greater than 1, the Teams tab is not rendered and the People tabs become a 3-column layout (Athletes, Judges, Heats).
   - If at least one division has team size > 1, the Teams tab appears as today.

2. **Create Team dialog only offers team divisions**
   - The division dropdown in the Create Team dialog lists only divisions with team size > 1.
   - Division becomes required when team divisions exist, so a team can never be attached to a solo division.

3. **Solo divisions display athlete names, not teams**
   - Anywhere a solo division's entry is shown (teams list, heat lanes, leaderboard rows sourced from teams), an athlete registered in a solo division is displayed by their own name instead of an auto-created team wrapper.
   - The teams list filters out entries belonging to solo divisions.

4. **Registration flow follows the same rule**
   - On the public event page and the embedded registration card, the Individual / Team mode toggle only appears when at least one division has team size > 1. If every division is solo, registration goes straight to the individual form.
   - Once a division is picked, its team size decides the form: size 1 shows only the athlete's own details (no team name, no teammate slots); size > 1 requires a team name and exactly `team_size - 1` teammate entries.
   - The "join an existing team" picker only lists teams from team divisions, and existing full teams stay excluded.
   - Registrations created in a solo division are stored without a team wrapper and shown by athlete name.

## Technical notes

- Source of truth: `competition_divisions.team_size` via the existing `useDivisions` hook. No schema change.
- Files: `src/modules/tournaments/components/PeopleTab.tsx` (conditional tab + grid columns), `src/modules/tournaments/components/TeamsListView.tsx` (filtered division select, required division, hide solo-division teams), `src/components/competition/RegisterForCompetitionCard.tsx` and `src/pages/CompetitionPublic.tsx` (mode toggle gating, team-name/teammate fields driven by the selected division's team size, filtered team picker).
- Both registration surfaces already read `team_size` for teammate slots; this extends it to the mode toggle, team-name requirement, and team picker.
- Existing capacity enforcement in `ManageTeamMembersDialog.tsx` already reads `team_size`; it stays as is.
