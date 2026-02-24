
# Guide / How-To Page for the Platform

## Overview

Create a new `/guide` page that serves as a comprehensive, well-organized reference for users to understand how the competition platform works. The page will use collapsible accordion sections for easy navigation, covering every feature from creating a competition to managing brackets and scoring.

## Page Structure

The guide page will be organized into these accordion sections:

### 1. Getting Started
- Creating your account and profile
- Navigating the main menu
- Understanding your tier/subscription

### 2. Creating a Competition
- Name, date, venue, host gym fields
- Competition type selection
- Age category setup (Open, Under X, Age Range)
- What happens after creation (redirects to workout setup)

### 3. Understanding Divisions
- What divisions are (weight classes, skill levels, age groups, etc.)
- How to create and name divisions
- How divisions affect team grouping and leaderboard filtering
- Example: "Lightweight", "Heavyweight", "Beginner", "Advanced"

### 4. Setting Up Teams
- What teams represent (competing units -- can be individuals or groups)
- How to create a team and assign it to a division
- Naming conventions and best practices

### 5. Managing the Roster (Participants)
- What the roster is (individual athletes within teams)
- How admins add athletes to teams
- How athletes can self-register and join a team
- Difference between Teams and Roster entries

### 6. Configuring Workouts
- What workouts are (the scored events/challenges)
- Measurement types: time, reps, weight, points, distance
- Adding multiple workouts for multi-event competitions
- How workouts relate to scoring

### 7. Adding Judges
- What judges do (input scores for teams)
- How to search and add a judge by name
- Judge vs Owner permissions
- Mobile judge scoring view

### 8. Understanding Brackets (Tournament Mode)
- What brackets are (elimination-style matchups)
- When to use brackets vs straightforward scoring
- How bracket generation works (auto-seeded by division)
- Managing bouts and setting winners
- Regenerating brackets

### 9. Running a Straightforward Competition (No Brackets)
- Skip the seeding/bracket phase
- Use workouts + scores + leaderboard only
- Step-by-step: Create comp -> Add divisions -> Add teams -> Add workouts -> Open registration -> Score -> View leaderboard

### 10. Competition Lifecycle (Status Flow)
- Draft: initial setup (teams, workouts, divisions)
- Registration: athletes join teams
- Seeding: generate brackets (skip if no brackets needed)
- In Progress: scoring and bouts
- Completed: final leaderboard
- Requirements to advance each stage

### 11. Scoring
- How to enter scores per team per workout
- Score locking (preventing edits)
- How the leaderboard calculates rankings

### 12. Leaderboard
- How rankings are computed
- Division-based filtering
- Real-time updates

## Technical Details

### Files

| File | Action |
|---|---|
| `src/pages/Guide.tsx` | CREATE -- Full guide page with accordion sections |
| `src/App.tsx` | UPDATE -- Add `/guide` route (public, no auth required) |

### Design

- Uses existing UI components: `Accordion`, `Card`, `Button`, `CompetitionHeader`
- Dark theme consistent with the rest of the app
- Back button to return to menu/home
- Each section is a collapsible accordion item with clear headings and bullet-point content
- No database changes needed -- purely static content page
- The `/tutorial` placeholder page (if already created) will redirect to `/guide`, or we update it to be the guide itself

### Navigation

- The guide will be accessible from:
  - The `/tutorial` route (same page or redirect)
  - A link in the main menu footer area
  - The landing page "How It Works" button
