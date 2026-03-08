

## Analysis

### Current State
The competition creation wizard exists as a 4-step flow (Details → Sport → Divisions → Workouts) but has several issues:

1. **Mobile UX problems**: The 3-column workout builder layout (`lg:grid-cols-12`) collapses to a single column on mobile but is still verbose and hard to use
2. **Console warnings**: Nested `<button>` elements in WorkoutBuilderPro workout tabs; Badge ref warning in WorkoutSettingsPanel
3. **Step 2 (Sport) depends on `competition_types` table** which exists and has data -- this works
4. **Movement builder on mobile**: Parameters row (`pl-11` with 6 inline inputs) overflows on small screens
5. **No mobile-optimized workflow** for quick workout creation -- the 3-column desktop layout doesn't translate well
6. **Division panel is minimal** -- no quick-add presets for common CrossFit divisions

### Database Schema -- No Changes Needed
All required tables exist:
- `competition_workouts`: has `workout_type`, `scoring_type`, `time_cap_seconds`, `name`, `description`
- `workout_movements`: has `movement_name`, `reps`, `weight`, `distance`, `calories`, `target_height`, `box_height`, `video_url`, `description`, `sequence_order`
- `competition_divisions`: has `name`, `sort_order`, `competition_id`
- `competition_types`: has CrossFit, MMA, BJJ, Other

No schema migrations required.

---

## Plan

### 1. Fix Mobile Layout for Workout Builder
**File: `WorkoutBuilderPro.tsx`**
- On mobile, switch from 3-column grid to a tabbed/accordion layout: Settings tab, Movements tab, Preview tab
- Use `useIsMobile()` hook to conditionally render mobile vs desktop layouts
- Fix nested `<button>` warning by changing outer workout tab from `<button>` to `<div role="button">`

### 2. Fix Movement Builder Mobile UX
**File: `MovementBuilderPanel.tsx`**
- Wrap the 6-parameter inputs in a responsive grid (`grid-cols-3 sm:grid-cols-6`) instead of inline flex
- Make reorder/duplicate/delete buttons always visible on mobile (not just on hover)
- Increase touch targets to minimum 44px

### 3. Fix WorkoutSettingsPanel Badge Warning
**File: `WorkoutSettingsPanel.tsx`**
- The `Badge` component is receiving a ref it can't handle -- wrap the time cap badge display differently (use `<span>` with badge styling instead)

### 4. Add Division Quick-Add Presets
**File: `DivisionsPanel.tsx`**
- Add a row of preset buttons for common CrossFit divisions: "RX Male", "RX Female", "Scaled Male", "Scaled Female", "Masters 35+"
- Tapping a preset adds the division immediately
- Only show presets when no divisions exist yet

### 5. Mobile-Optimized Step Indicator
**File: `StepIndicator.tsx`**
- Show step numbers only on mobile (already partially done with `hidden sm:inline` on labels)
- Make the indicator horizontally scrollable on very small screens

### 6. Improve Competition Create Mobile Layout
**File: `CompetitionCreate.tsx`**
- Ensure full-width padding works on mobile
- On workouts step, don't force `max-w-7xl` on mobile -- let it be full-width with appropriate padding
- Make Back/Next buttons sticky at bottom on mobile for easy thumb access

### 7. Workout Difficulty Estimator in Preview
**File: `WorkoutPreviewPanel.tsx`**
- Add estimated total reps and projected rounds (for AMRAP with time cap) below the preview
- Simple calculation: `estimatedRounds = (timeCap / 60) * repsPerRound / avgTimePerRep`

### Summary of Files to Edit
1. `src/modules/tournaments/components/workout-builder/WorkoutBuilderPro.tsx` -- mobile tabbed layout
2. `src/modules/tournaments/components/workout-builder/MovementBuilderPanel.tsx` -- responsive parameter grid
3. `src/modules/tournaments/components/workout-builder/WorkoutSettingsPanel.tsx` -- fix Badge warning
4. `src/modules/tournaments/components/workout-builder/WorkoutPreviewPanel.tsx` -- difficulty estimator
5. `src/modules/tournaments/components/DivisionsPanel.tsx` -- division presets
6. `src/modules/tournaments/components/create/StepIndicator.tsx` -- mobile improvements
7. `src/pages/CompetitionCreate.tsx` -- sticky nav, mobile padding

