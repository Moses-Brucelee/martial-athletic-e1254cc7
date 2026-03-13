# Competition Platform — Quick Setup Overhaul

## Implemented

### 1. Database Migration ✅
- `ranking_direction` (text, default 'desc') + `setup_mode` (text, default 'advanced') on `competition_settings`
- `max_teams` (integer) + `waitlist_enabled` (boolean, default true) on `competitions`

### 2. Date Validation ✅
- Registration deadline `maxDate = startDate` on StepDetails
- DateTimePicker now supports `maxDate` prop

### 3. Quick vs Advanced Setup Mode ✅
- StepSportType: CrossFit shows Quick/Advanced sub-selector
- Quick flow: `["Details", "Sport & Mode", "Configure"]`
- Advanced flow: `["Details", "Sport & Mode", "Divisions", "Workouts"]` (unchanged)

### 4. StepQuickConfig ✅
- Single page: divisions (presets + custom), text workouts (name + description, scoring_type='points'), ranking direction, capacity (max_teams, waitlist)
- On submit: creates divisions, workouts, upserts settings with setup_mode='quick'

### 5. Quick Mode Dashboard — Status-Driven Tabs ✅
- draft: Setup, Workouts
- published: Setup, Workouts, People
- live: Command, Scores, Leaderboard, People
- completed: Leaderboard only

### 6. Unified People Tab ✅
- Single tab combining: Registrations, Teams, Judges, Heats/Lanes

### 7. Judge Auto-Populate ✅
- Type-ahead search from `athlete_registrations` (registered users in the competition)
- Display names instead of UUIDs; prevent duplicate judges

### 8. Leaderboard Ranking Direction ✅
- Respects `ranking_direction` from `competition_settings`
- `asc` = lowest points on top, `desc` = highest on top

### 9. Advanced Mode — Parked ✅
- No changes to advanced mode flow or dashboard
- Advanced dashboard keeps 9-tab owner layout

## What Stays Unchanged
- Scoring engine, edge functions, existing DB tables
- All existing RPC functions (get_competition_leaderboard, etc.)
- ScoresPanel already handles scoring_type='points' correctly
