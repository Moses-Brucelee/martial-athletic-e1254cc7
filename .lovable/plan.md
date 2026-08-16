# Guarded Competition Status Changes

Every status transition (Draft → Published → Live → Completed) will first run a readiness check on the competition, then require explicit confirmation in a dialog before it is applied.

## Behaviour

When the organizer clicks the transition button (e.g. "Publish Competition"), a dialog opens showing:

- What the change means and what it affects (registration opening, scoring unlocking, scores locking).
- A checklist of readiness rules with pass / warning / blocker markers.
- Blockers disable the confirm button with a short explanation of what to fix.
- Warnings are shown but can be overridden by confirming.

Nothing is written to the database until the user confirms.

## Readiness rules per transition

Draft → Published
- Blockers: no name, no start date, no divisions.
- Warnings: no workouts, no registration deadline, no venue, no poster, deadline after start date.

Published → Live
- Blockers: no workouts, no registrations/teams.
- Warnings: no heats scheduled, no judges assigned, registration deadline still in the future, start date still in the future.

Live → Completed
- Blockers: none.
- Warnings: workouts with missing scores, unlocked scores, incomplete leaderboard. Copy states clearly that scores get locked and this is hard to reverse.

## Technical notes

- New pure module `src/modules/tournaments/statusValidation.ts` exporting `validateTransition(from, to, ctx)` returning `{ blockers: string[]; warnings: string[] }` plus the confirmation copy per transition. No DB or React imports, unit-testable.
- `CompetitionStatusActions.tsx` becomes the dialog host: fetches the counts it needs (divisions, workouts, registrations/teams, heats, judges, scores) with existing hooks/queries, builds the context, opens a shadcn `AlertDialog` on click, and only calls `useUpdateCompetitionStatus` on confirm.
- Existing mutation, toast, and derived-status logic stay unchanged.
- Add `src/test/statusValidation.test.ts` covering blocker/warning outcomes for each transition.
