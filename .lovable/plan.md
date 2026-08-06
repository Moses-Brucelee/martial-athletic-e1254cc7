# Programs: Training Management System

Replace the empty "Explore Programs" experience with a real training module at `/programs`, built inside a new self-contained `src/modules/programs/` folder. Nothing outside the module changes except: a new route in `App.tsx`, the Program Spotlight card pointing at `/programs`, and a new feature flag entry. Competitions, scoring, leaderboards, auth, subscriptions and athlete management are untouched.

## What the user gets

**Programs dashboard (`/programs`)** — no empty screen:
- Today's Workout card (resume in-progress session or start today's assigned day)
- My Programs (self-enrolled, with week/day progress)
- Assigned Programs (assigned by a coach/gym owner)
- Program Library (browse by category: Strength, CrossFit, Weightlifting, Hyrox, Functional Fitness, Gymnastics, Running, Mobility, Endurance)
- Workout History (recent completed sessions)
- Progress Summary (sessions this week, volume, streak)
- Personal Best Highlights — read from the athlete's existing performance data, displayed only, not owned by Programs

**Program detail** — week → day → workout outline with completion ticks.

**Workout player (`/programs/session/:sessionId`)** — interactive, one exercise at a time: Start Workout, Complete Set, Skip Exercise, Pause, Finish. Auto-advances, logs each set as it happens so nothing is lost if the tab closes.

**Smart timers** — the timer is chosen from the workout's own metadata (`workout_format` + params), never hardcoded: EMOM, AMRAP, For Time, Tabata, Interval, Rest, Countdown, Stopwatch. One `useWorkoutTimer` hook drives all modes.

**Smart defaults / no repeated questions** — a `useTrainingDefaults` hook resolves, in priority order: last logged value for that movement → athlete profile (units, gender, age from DOB, gym/affiliation) → sensible fallback. Load, reps, rest and units are prefilled; the creation forms only ask what the chosen format genuinely needs (AMRAP → rounds/time/exercises; EMOM → minutes/interval/exercises).

**Coach view** — for gym owners/coaches on a program they assigned: completion rate per athlete, missed sessions, session logs and athlete notes. Read-only over the same tables; no change to existing coach/gym permissions.

## Data model (new tables only, all `public`, RLS + GRANTs)

Templates vs execution are strictly separated.

```text
programs            -> weeks -> days -> workouts -> sections -> exercises   (templates)
program_enrollments -> who is doing which program, self or coach-assigned
workout_sessions    -> one execution record (status, started/finished, notes)
exercise_results    -> per set: reps, load, time, distance, completed/skipped
movements           -> shared movement catalogue (seeded, reusable)
```

- `program_weeks`, `program_days`, `program_workouts`, `workout_sections`, `section_exercises`
- Exercise fields: sets, reps, duration_seconds, distance, load, load_unit, tempo, rest_seconds, notes
- `program_workouts` carries `workout_format` + `format_config jsonb` (drives the timer)
- No completed data is ever written into program tables.

Access rules in plain English:
- Anyone signed in can read published/public programs; drafts only by their author.
- Program authors and gym owners can create and edit their own programs.
- Athletes can read programs they're enrolled in or assigned.
- Athletes own their sessions and results; the coach who assigned the program can read them.

## Personal bests

Programs do **not** own PBs. Completing a workout writes `exercise_results` only. PB highlights are derived from athlete history via a read-only selector in the programs module and shown on the dashboard and on `/performances`-style cards. Existing PB/performance code is not modified.

## Technical notes

- New folder `src/modules/programs/` mirroring the existing module layout: `api.ts`, `hooks.ts`, `types.ts`, `components/`.
- Reuse `AppHeader`, `BottomNav`, shadcn cards/buttons/badges/sheets, existing tokens and Oswald/Inter typography — no new design system.
- Reuse `useProfile`, `useAuth`, `useTier`, `useFeatureFlag`; profile is read from the existing React Query cache, never re-fetched per component.
- New flag `training_programs` in `src/lib/featureFlags.ts` (default on) so it can be toggled from the super dashboard.
- Routes added to `App.tsx`: `/programs`, `/programs/:programId`, `/programs/session/:sessionId` — all lazy-loaded. `/browse` stays exactly as-is.
- React Query keys namespaced `["programs", ...]`; program library list is paginated/lazy.

## Build order (app stays working after each step)

1. Migration: tables, GRANTs, RLS, movement seed data.
2. Module scaffolding: types, api, hooks.
3. Programs dashboard + route + spotlight link.
4. Program detail + library browse.
5. Workout player + timer engine.
6. History, progress summary, PB highlights.
7. Coach tracking view.
