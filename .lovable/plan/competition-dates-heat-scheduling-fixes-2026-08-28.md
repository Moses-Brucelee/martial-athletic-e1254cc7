# Competition Dates & Heat Scheduling Fixes

Targeted fixes to date pickers, date/time validation, and heat/lane scheduling. No redesigns, no changes to scoring, registration, profiles, or subscriptions.

## 1. Date picker behaviour (shared component)

The shared date/time picker currently always opens on the current month and its time list is unrestricted.

- Add an optional "open at this date" reference so a picker can open on the relevant month instead of today.
- Restrict the time list when the selected day equals the min day (hide earlier times) or the max day (hide later times), so an invalid time cannot be picked at all.
- Keep the existing mobile native input path, with correct `min`/`max` down to the minute.

## 2. Competition dates

In the create wizard, the super-admin competition editor, and the competition edit panel:

- Registration deadline picker: only dates from now up to the competition start are selectable; past dates and dates after the start are disabled; on the start day only times before the start time are allowed.
- End date picker: opens on the competition start date/time (or the existing end date when editing). If no end date has been chosen yet, it pre-populates with the start date so same-day events need no scrolling. An existing valid end date is never overwritten.
- End must be after start (same day allowed when the end time is later); the existing one-month maximum stays.
- Start date cannot be in the past for new competitions; existing past starts are left alone when editing.

The same rules stay in the shared validation helper so both the UI and the save path enforce them.

## 3. Heat scheduling

Heats currently store only a start time and no length, so overlap cannot be computed. Add a heat duration (minutes) to the heat schedule, defaulting to the workout time cap when one exists, otherwise 10 minutes. Existing heats get the default, so nothing already saved changes meaning.

Rules enforced in a new scheduling helper used by both the manual add form, the auto-generator, and inline heat time editing:

- Heat start and heat end must fall inside the competition start/end window; the heat date picker disables anything outside that range.
- Heat end must be after heat start.
- Two heats that share a lane cannot overlap: `newStart < existingEnd && newEnd > existingStart`. Lane occupancy is derived from lane assignments on each heat; heats with no assignments yet are checked by heat-level overlap against the same lanes they would occupy.
- Editing a heat excludes itself from the conflict check.
- Different lanes may run at the same time.

## 4. Smart defaults

- First heat of a competition defaults to the competition start date/time.
- Subsequent heats default to the end of the latest scheduled heat (start + duration), clamped to the competition window.
- Pickers never reset to today when a competition schedule already exists.
- The manual heat form and the lane assigner show which lanes are already busy for the chosen window, with a short reason when a lane is unavailable.

## 5. Errors

Conflicts are surfaced inline before saving (disabled options plus a short explanation) and, if a conflicting save is still attempted, rejected with a clear toast naming the lane and clashing heat.

## Technical notes

- New file `src/lib/scheduling.ts`: overlap detection, competition-window checks, next-available-time computation, lane availability — plus unit tests covering same-day, multi-day, partial overlaps, parallel lanes, and self-exclusion on edit.
- Extend `validateCompetitionDates` in `src/lib/validation.ts` with the "deadline not in the past" rule; keep the existing signature and error shape.
- Extend `src/components/ui/date-time-picker.tsx` with a `defaultMonth`/reference date and min/max time clamping; existing call sites keep working unchanged.
- Migration: add `duration_minutes integer not null default 10` to `heat_schedule`; backfill existing rows from the linked workout time cap where available. No policy or grant changes.
- Wire the helper into `HeatManagementPanel.tsx`, `AutoHeatGenerator.tsx`, `HeatLaneAssigner.tsx`, `StepDetails.tsx`, `CompetitionEditPanel.tsx`, and `SuperCompetitionEditor.tsx`.
- Verify with the existing test runner plus a browser pass over create → publish → heats for a same-day and a multi-day competition.