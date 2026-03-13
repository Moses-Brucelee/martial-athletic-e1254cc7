

## Your Recommendations — Status Check

The `.lovable/plan.md` file is **still the old plan** and hasn't been updated with any of your recent recommendations. Here's a consolidated tracker of everything you've asked for across our conversation:

| # | Your Recommendation | Status |
|---|---------------------|--------|
| 1 | Registration deadline can't be after competition start date | **Discussed, not implemented** |
| 2 | Division state not maintained when navigating wizard steps | **Discussed, not implemented** |
| 3 | Quick Setup vs Advanced Setup modes for CrossFit | **Discussed, not implemented** |
| 4 | Quick/Classic: judges enter points directly, no movement scoring | **Discussed, not implemented** |
| 5 | Status-driven tab visibility (draft→published→live→completed) | **Discussed, not implemented** |
| 6 | Command tab only visible when competition is live | **Discussed, not implemented** |
| 7 | Leaderboard ranking direction (highest/lowest wins) | **Discussed, not implemented** |
| 8 | Registration capacity (max_athletes, max_teams, waitlist) | **Discussed, not implemented** |
| 9 | Judge auto-populate from registered athletes (type-ahead) | **Discussed, not implemented** |
| 10 | All people fields auto-suggest from registered athletes | **Discussed, not implemented** |
| 11 | Unified People tab (registrations, teams, judges, heats in one screen) | **Discussed, not implemented** |
| 12 | Advanced mode stays untouched — park it, no changes | **Discussed, not implemented** |

**Nothing has been built yet.** We've been refining the plan across multiple messages. The plan.md needs to be rewritten to reflect the final agreed design, then we implement.

---

## Proposed: Rewrite plan.md with final consolidated plan, then implement

The updated plan.md will cover:

### Database Migration
- `ranking_direction` + `setup_mode` on `competition_settings`
- `max_teams` + `waitlist_enabled` on `competitions`

### Creation Wizard Changes
- Date validation: `regDeadline maxDate = startDate`
- CrossFit sport → Quick/Advanced sub-selector
- Quick flow: `["Details", "Sport & Mode", "Configure"]` → single StepQuickConfig page (divisions + text workouts with `scoring_type: 'points'` + ranking direction + capacity)
- Advanced flow: unchanged (parked)

### Quick Mode Dashboard — Status-Driven Tabs
- **draft**: Setup, Workouts
- **published**: Setup, Workouts, People
- **live**: Command, Scores, Leaderboard, People
- **completed**: Leaderboard

### Unified People Tab (Quick Mode)
- Single screen: Registrations, Teams, Judges, Heats/Lanes
- All people inputs auto-suggest from registered athletes in that competition

### Judge Auto-Populate
- Type-ahead search from `athlete_registrations` for the competition
- Show display names, prevent duplicates
- `fetchJudges` joins `profiles` to show names instead of UUIDs

### Leaderboard
- Respect `ranking_direction` from `competition_settings`
- `asc` = lowest points on top, `desc` = highest on top

### What Stays Unchanged
- Advanced mode (entire flow + dashboard) — parked
- Existing scoring engine, edge functions, DB tables
- All existing RPC functions

