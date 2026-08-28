# Tie Breakers & "For Time" Partial Scoring

Adds a competition-level global tie breaker, an optional per-workout tie breaker time, and support for "For Time" workouts where teams don't finish the prescribed work. Everything plugs into the existing scoring tables, workout rankings and leaderboard — no new parallel scoring system.

## What changes for users

**Competition settings (Scoring & Tie Breakers)**
- New "Global tie breaker" choice:
  - No global tie breaker (default, and what every existing competition keeps) — tied teams stay tied and share a position (1st, 1st, 3rd).
  - Most wins, then top placements — only applied when overall scores are equal: most 1st places, then most 2nd places, then 3rd, and so on, one placement at a time (never summed together).
- The existing scoring model and existing tie breaker setting stay exactly as they are.

**Workout create/edit**
- New optional "Tie breaker" field: None (default) or Time — "Quickest tie breaker time wins".
- When the workout's scoring type is For Time, an extra "Additional scoring opportunity" block appears: a target amount plus a unit (reps, rounds, distance, calories — reusing the units the app already supports). Not shown for other scoring types.

**Score entry (scores panel, quick entry, mobile judge scoring)**
- When a For Time workout has a target set, judges can record how much work a team completed alongside the time.
- When a workout has a Time tie breaker, a tie breaker time field appears.
- Validation: completed work can't be negative or exceed the target; a team is complete only when completed work equals the target.

**Leaderboard**
- Shared positions are rendered when teams genuinely tie.
- When the global tie breaker resolves a tie, the row shows why (e.g. "3 wins").

## Ranking rules implemented

Per workout (For Time with a target):
1. Teams that completed the target rank above every incomplete team.
2. Completed teams: fastest time wins.
3. Incomplete teams: most work completed wins.
4. Still equal → quickest tie breaker time, if the workout has one configured.
5. Still equal → teams stay tied (same placement).

All other scoring types keep their current behaviour, with the tie breaker time applied only when primary scores are equal.

Overall: existing overall score/rank-sum first; the global tie breaker only runs on exact ties.

## Technical details

**Migration**
- `competition_settings.global_tie_breaker text not null default 'none'` (`none` | `most_wins_placements`).
- `competition_workouts`: `tie_breaker_type text not null default 'none'` (`none` | `time`), `target_work numeric null`, `target_unit text null`.
- `competition_scores`: `tie_breaker_seconds integer null`, `work_completed numeric null`, with non-negative checks.
- All new columns nullable/defaulted so existing rows and flows are unaffected.

**Single source of truth**
- `recompute_workout_rankings` gets the new ordering: `dense_rank()` over `(is_complete, completion_time, -work_completed, tie_breaker_seconds)` so ties collapse naturally.
- `get_competition_leaderboard` is rewritten to use the same ordering expression, then aggregates placement counts per team into an ordered `int[]` (count of 1sts, 2nds, 3rds …). When the global tie breaker is on, ordering is `total_points`, then that array descending (Postgres compares arrays lexicographically, which is exactly the "best placement first" rule); when off, ordering stops at `total_points` and `dense_rank` leaves teams tied.
- The RPC gains extra return columns (`overall_rank`, `wins`, `placement_counts`) appended at the end; existing callers keep working.
- `src/domain/engine.ts` gets pure `rankWorkoutEntries` / `compareGlobalTieBreak` helpers mirroring the SQL, used by the UI for optimistic display, with unit tests in `src/test/`.

**Frontend touch points**
- `CompetitionSettingsPanel.tsx` — global tie breaker select.
- `QuickWorkoutsPanel.tsx` (edit dialog) and `workout-builder` — tie breaker type + For Time target/unit fields, conditionally rendered.
- `ScoresPanel.tsx`, `QuickScoreEntry.tsx`, `MobileJudgeScoring.tsx` — completed-work and tie-breaker-time inputs plus validation; `ScoreUpsert` in `src/modules/scoring/api.ts` and `src/data/scoring.ts` extended with the two new fields.
- `modules/leaderboard/components/LeaderboardPanel.tsx` — shared placements and tie-break reason.

**Tests**
Unit tests cover: overall tie broken by wins; tie with equal wins but different 2nd-place counts; no global tie breaker leaves teams tied; completed teams ordered by time; completed above incomplete; incomplete ordered by work; equal incomplete work resolved by tie breaker time; no tie breaker leaves teams tied; legacy workouts with no new fields rank exactly as before.

## Out of scope
Heat scheduling, lanes, registrations, athlete profiles, billing, and any unrelated page redesign.
