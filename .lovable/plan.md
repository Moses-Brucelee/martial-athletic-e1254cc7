

# Phase 1A, 1B, 1C Implementation Plan

## Overview

Build the core screens for Martial Athletic based on the Figma screenshots. Phase 1A covers auth and profile setup (partially done). Phase 1B adds tournament/competition creation and workout scoring. Phase 1C covers the competition dashboard with teams and workouts.

---

## What Already Exists

- Login page (complete)
- Register page (complete)
- Dashboard page (placeholder -- will be replaced with Main Menu)
- Auth system with session management
- Profiles table with `display_name` and `avatar_url`
- Theme system (light/dark/system)

---

## Required Database Changes

### 1. Extend `profiles` table with new columns

| Column | Type | Notes |
|--------|------|-------|
| full_name | text | Name and Surname |
| gender | text | nullable |
| age | integer | nullable |
| affiliation | text | Gym/club affiliation |
| about_me | text | Bio textarea |
| profile_completed | boolean | default false, tracks if profile setup is done |
| subscription_tier | text | default 'free' (free / tournament_pro / affiliate_pro) |

### 2. New table: `competitions`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| created_by | uuid | references profiles.user_id, NOT NULL |
| name | text | NOT NULL |
| date | date | nullable |
| venue | text | nullable |
| type | text | nullable |
| host_gym | text | nullable |
| divisions | text | nullable (comma-separated or JSON) |
| status | text | default 'draft' (draft / active / completed) |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

RLS: Users can CRUD their own competitions (created_by = auth.uid()). All authenticated users can SELECT competitions.

### 3. New table: `competition_workouts`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| competition_id | uuid | FK to competitions.id, ON DELETE CASCADE |
| workout_number | integer | NOT NULL (1, 2, 3...) |
| measurement_type | text | NOT NULL (e.g. 'time', 'reps', 'weight', 'points') |
| name | text | nullable |
| created_at | timestamptz | default now() |

RLS: Competition owner can CRUD. Authenticated users can SELECT.

### 4. New table: `competition_teams`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| competition_id | uuid | FK to competitions.id, ON DELETE CASCADE |
| team_name | text | NOT NULL |
| division | text | nullable |
| created_at | timestamptz | default now() |

RLS: Competition owner can CRUD. Authenticated users can SELECT.

---

## Screens to Build

### Screen 1: Create Profile (`/create-profile`)

Based on screenshot (image-11):

- Header with logo + "CREATE YOUR PROFILE" title
- Form fields: Name and Surname, Gender, Age, Affiliation (left column)
- Profile picture upload area (right side on desktop, top on mobile)
- "About Me" textarea spanning full width
- "Skip" and "Create" buttons at bottom
- After registration, redirect here if `profile_completed` is false
- Skip sets `profile_completed = true` without filling fields
- Create saves fields and sets `profile_completed = true`
- Profile picture uploads to a storage bucket

### Screen 2: Main Menu (`/dashboard` -- replaces current Dashboard)

Based on screenshots (image-12 and image-13):

- Header with logo + "MAIN MENU" title + subscription badge + avatar
- Subscription tier display: "TOURNAMENT PRO" (red), "AFFILIATE PRO" (green badge), or "Free" (green text)
- Buttons:
  - "CREATE COMPETITION" (changes to "VIEW / BUILD YOUR COMP" if user has competitions)
  - "VIEW COMPETITIONS"
  - "VIEW PROFILE"
  - "UPGRADE PACKAGE"
- Dark card-based layout matching the design
- Query competitions table to determine if user has any (toggles button label)

### Screen 3: Tournament Creation (`/competition/create`)

Based on screenshot (image-14):

- Header with logo + "TOURNAMENT" title + subscription badge + avatar + hamburger menu
- "Create Your Competition" section title
- Form fields in rows: Competition Name, Date, Venue, Type, Host Gym, Divisions
- Left/Right arrow navigation buttons (for multi-step wizard)
- Green info banner at bottom: "Details entered below in the selected fields will be displayed in the advertisement similar to the below"
- Saves to `competitions` table

### Screen 4: Workout/Scoring Setup (`/competition/:id/workouts`)

Based on screenshot (image-15):

- Same header pattern as Tournament Creation
- "CREATE WORKOUT / SCORING OPPORTUNITIES" title
- Workout rows: Workout #1, #2, #3 with "SELECT MEASUREMENT" dropdown each
- Green "ADD WORKOUT" button with plus icon
- Left/Right arrow navigation
- Green info banner about team signup process
- Saves to `competition_workouts` table

### Screen 5: Competition Dashboard (`/competition/:id`)

Based on screenshot (image-16):

- Same header pattern
- "COMPETITION DASHBOARD" subtitle
- Two-column layout:
  - Left: TEAMS list with division labels, "ADD DIVISION" button
  - Right: WORKOUTS list showing workout details with measurement selectors, "ADD WORKOUT" button
- Reads from `competition_teams` and `competition_workouts`

---

## New Components

| Component | Purpose |
|-----------|---------|
| `CompetitionHeader` | Reusable header with logo, "TOURNAMENT" title, subscription badge, avatar, menu |
| `MainMenuButton` | Styled button matching the dark Main Menu design |
| `WorkoutRow` | Workout entry with number label and measurement dropdown |
| `TeamCard` | Team display card with division label |

---

## Route Changes (App.tsx)

```text
/create-profile    -> CreateProfile (protected, shown after register if profile not completed)
/dashboard         -> MainMenu (protected, replaces current Dashboard)
/competition/create -> CompetitionCreate (protected)
/competition/:id   -> CompetitionDashboard (protected)
/competition/:id/workouts -> CompetitionWorkouts (protected)
```

---

## Storage Bucket

A new `avatars` storage bucket is needed for profile picture uploads. RLS: users can upload/read their own files.

---

## Auth Flow Update

After login, check if `profile_completed` is false. If so, redirect to `/create-profile` instead of `/dashboard`.

---

## Technical Notes

- All database access uses standard `@supabase/supabase-js` -- no proprietary services
- All components use existing theme CSS variables (light/dark/system)
- Mobile-first layout with responsive breakpoints
- Loading states: skeleton placeholders for data fetching
- Error states: inline error messages with retry options
- Empty states: descriptive messages when no competitions/teams exist
- File uploads use standard storage buckets with signed URLs

