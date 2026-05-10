## Plan: Multi-feature improvements

### 1. Sponsor photo — disable auto background removal for PNGs
- Locate sponsor upload component (PosterUpload or sponsor-specific uploader).
- If file extension is `.png`, skip background removal step; otherwise keep current behavior.

### 2. Divisions — Team Size selector
- In Competition Dashboard → Divisions detail/edit panel, add a "Team Size" numeric selector (1–10).
- Persist to `competition_divisions.team_size` (add column via migration if missing).
- Registration page roster input must dynamically render exactly N name fields based on division's team_size.

### 3. Registration link page — hero poster clipping fix
- Inspect `CompetitionPublic.tsx` hero/poster rendering.
- Adjust container so AdaptivePoster maintains aspect ratio without clipping (use `object-contain` on small viewports or adjust max-height).

### 4. Workout reveal on registration page — make clickable
- On `CompetitionPublic.tsx`, workouts list shows a "reveal" toggle. Make each workout tile clickable to open a dialog/sheet showing the full workout (movements, scoring, time cap, notes).

### 5. Heat dropdown — hide already-assigned teams
- In Heat assignment UI (HeatLaneAssigner / HeatManagementPanel), filter team options to exclude teams already placed in that heat (or any heat for same workout/round, depending on existing logic).

### 6. For Time workouts — score input as mm:ss in leaderboard
- Where leaderboard displays For Time scores, format `time_seconds` as `mm:ss` (e.g., `5:24`).
- Workout breakdown table: detect `scoring_type === 'time'` per workout column and format accordingly.

### 7. Leaderboard score display — `score (placement)` format
- In LeaderboardPanel breakdown, each cell shows `score (Nth)` where N is team's rank for that workout.
- Compute per-workout rank using existing scoring logic (dense_rank by scoring_type direction).
- Use ordinal suffix (1st, 2nd, 3rd, …).

### Technical notes
- Migration: `ALTER TABLE competition_divisions ADD COLUMN IF NOT EXISTS team_size int NOT NULL DEFAULT 1;`
- New util: `formatTimeMMSS(seconds)`, `ordinal(n)` in `src/utils/`.
- Per-workout ranking computed client-side from `useScores` data, partitioned by `workout_id`, direction by `workout.scoring_type`.

### Files likely changed
- `src/components/competition/PosterUpload.tsx` (or sponsor upload component)
- `src/modules/tournaments/components/DivisionsPanel.tsx`
- `src/pages/CompetitionPublic.tsx`
- `src/modules/tournaments/components/HeatLaneAssigner.tsx`
- `src/modules/leaderboard/components/LeaderboardPanel.tsx`
- New: `src/utils/format.ts`
- New migration for `team_size`
