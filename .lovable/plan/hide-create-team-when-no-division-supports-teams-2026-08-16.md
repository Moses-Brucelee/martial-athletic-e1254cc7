# Hide "Create Team" when no division supports teams

The Teams sub-tab is already hidden for solo-only competitions, but the Athletes toolbar still shows a "Create Team" button (and the Add Athlete form still offers a Team field). Both should disappear when every division has a team size of 1.

## Changes

`src/modules/tournaments/components/UnifiedAthleteTable.tsx`
- Derive `teamDivisions` (divisions with `team_size > 1`) and a `teamsEnabled` flag from the divisions already loaded in this component.
- Hide the "Create Team" toolbar button when `teamsEnabled` is false.
- In the Create Team dialog, list only team divisions in the Division dropdown and make the selection required (same rule already applied in the Teams list view).
- In the Add Athlete form (desktop and mobile sheet), hide the Team picker when no division supports teams; otherwise only offer teams belonging to team divisions.

No backend, permission, or data changes.
