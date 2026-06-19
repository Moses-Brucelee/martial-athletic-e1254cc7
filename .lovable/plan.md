## Problem

The Teams panel shows every athlete as "UNKNOWN TEAM" and new teams can't be created/seen.

Network shows:
```
GET /rest/v1/competition_teams ... → 403
{"code":"42501","message":"permission denied for table competition_teams"}
```

Inspecting privileges on `competition_teams`:
```
anon          = awdDxtm   ← missing 'r' (SELECT)
authenticated = awdDxtm   ← missing 'r' (SELECT)
service_role  = arwdDxtm
```

Every other table in the project still has SELECT for these roles. Something (likely a recent migration touching teams/captain logic) ran `REVOKE SELECT ON competition_teams FROM anon, authenticated`, leaving the RLS policy in place but no underlying table-level SELECT — so PostgREST rejects every read with 42501, regardless of who's asking.

This is the only impacted table; data in the DB is intact (7 teams exist, athletes still reference them correctly).

## Fix

Single migration that re-grants the missing privileges to match the convention used by the rest of `public`:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_teams TO authenticated;
GRANT SELECT ON public.competition_teams TO anon;  -- matches RLS: public read for non-draft comps
GRANT ALL ON public.competition_teams TO service_role;
```

No RLS policy changes, no schema changes, no code changes. Visibility is still fully governed by the existing policies (`View teams (public for non-draft comps)`, `teams_delete`, `captain_update_own_team`, etc.).

## Verification

After the migration:
1. Reload `/competition/ca66f148-…` → team headers show real team names (Deadlifts and doughnuts, Nice to WOD You, etc.) instead of "UNKNOWN TEAM".
2. Network call to `competition_teams` returns 200 with 7 rows.
3. "Create Team" succeeds and the new row appears immediately.
