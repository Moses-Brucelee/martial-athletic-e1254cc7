# Judge name search with suggestions on heats

Turn the plain "type judge name" box on each heat into a smart search box.

## Behaviour

1. Typing 1-2 characters: nothing happens (no search noise).
2. From the 3rd character: the box searches people connected to this competition's affiliate/gym and its registered athletes, then shows a short suggestion list (max 8) under the box.
3. Picking a suggestion: that person becomes a judge on this competition (linked to their real account) and is assigned to the heat immediately.
4. No match: the list shows a single row - `Add "<typed name>" as a guest judge` - which creates a name-only judge and assigns them to the heat.
5. Already a judge on this heat: shown greyed out with an "on this heat" note so the same person is not added twice.
6. Same name typed again later: reuses the existing judge record instead of creating duplicates.

Search runs 300 ms after typing stops, shows a small "Searching..." hint, closes on outside click or Escape, and supports Enter to take the first suggestion.

## Where it appears

The expanded heat card, replacing the current free-text name field. The existing "Assign existing judge" dropdown stays for quickly re-using judges already on the competition.

## Technical notes

- New reusable component `src/modules/tournaments/components/JudgeSearchInput.tsx`, used by the heat card in `HeatManagementPanel.tsx`.
- Suggestion source: extend `src/data/judges.ts` with `searchJudgeCandidates(competitionId, query)` that unions
  - registered athletes with accounts via the existing `searchRegisteredUsers` path, and
  - members of the competition's gym (`gym_members` joined to `profiles`) when the competition has a `gym_id`,
  deduplicated by `user_id`, capped at 8, each row carrying `user_id`, `display_name`, and a source label (Athlete / Gym member).
- Selecting an account-backed person calls the existing `addJudge(competitionId, userId)`; the fallback row calls the existing `addGuestJudge`. Both then call `assignHeatJudge(heatId, judge.id)` and invalidate the `judges` and `heat-judges` queries.
- Before inserting, check the loaded competition judges for the same `user_id` (or case-insensitive display name for guests) and reuse that record.
- No database schema changes, no new tables, no migration.
