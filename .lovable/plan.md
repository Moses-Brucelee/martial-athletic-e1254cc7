## Goal
Make the competition flow work the way users expect:

- A shared `/event/:id` link should load for anyone, even if they are not logged in and even if the competition is affiliate-only.
- If the viewer wants to enter the competition, they sign up / log in and register from the same competition experience.
- The Competition Dashboard's **Registration & Teams** tab should also allow registration directly, so users do not need to jump to another link.
- If a competition belongs to an affiliate, the public page can be seen by everyone, but actual registration should require the user to become part of that affiliate.
- Profile information already provided during signup/registration should be reused instead of asking for the same name again unnecessarily.

## What is currently happening
The public event page uses the same normal competition query as the private dashboard:

- `CompetitionPublic.tsx` calls `useCompetition(id)`.
- `useCompetition` calls `fetchCompetition` from `src/modules/tournaments/api.ts`.
- That reads directly from `competitions`.

The database access rule for `competitions` currently allows public viewing only when:

- the competition is marked `visibility = 'public'`, or
- the logged-in user is owner / judge / registrant / active gym member.

So an affiliate/private competition link can fail before login with **Unable to load competition**, because anonymous users are not allowed to read that competition row. That is why the shared link behaves like it only works after the person is registered or has affiliate access.

## Required behavior after the fix
### Public shared link
- `/event/:id` loads for anonymous users for any non-draft competition that has been published/shared.
- The public page displays safe public information only: name, dates, venue, host gym, poster, description, divisions, visible/revealed workouts, public roster/teams where applicable.
- Draft/unpublished competitions stay hidden.

### Affiliate restriction
- Public viewing is not the same as competition access.
- If the competition has `visibility = 'private'` and a `gym_id`, the public page still opens.
- When the user tries to register, the app checks their affiliate membership:
  - Not logged in: send to signup/login and return to this competition.
  - Logged in but not affiliated: show a clear **Request affiliate access** action for that gym.
  - Pending membership: show **Pending approval** and disable competition registration until approved.
  - Active member: allow registration.

### Dashboard registration
- On `/competition/:id`, inside **Registration & Teams**, users can register directly from the tab.
- No need to click Share or go to `/event/:id` just to register.
- Existing roster remains below the registration card and updates after registration.

### Reuse user/profile information
- Signup currently stores `display_name` into the profile through the signup trigger, so that information is not lost.
- The registration flow should prefill and use existing profile data:
  - Use profile display/full name for self-registration.
  - Do not ask for name again for self-registration if profile already has it.
  - Only ask for missing competition-required fields, e.g. date of birth if age eligibility requires it, division, team/teammate details.
- If registration captures useful self-profile fields that are missing on the profile, update the profile after successful self-registration where safe.

## Implementation plan
### 1. Add safe public event loading
Create a public-event data path instead of using the private dashboard query for `/event/:id`.

- Add a backend function/view for public event details that returns only safe fields for non-draft/non-unpublished competitions.
- Use this only on the public event page.
- Keep the existing `competitions` access rules for the authenticated dashboard list, so affiliate-only competitions do not suddenly appear in everyone's dashboard.

Technical note:
- This should be done through a Lovable Cloud migration, not by weakening the main `competitions` table policy globally.
- The function should expose public page data while preserving dashboard/member-only visibility rules.

### 2. Update public event page to use public-safe reads
In `CompetitionPublic.tsx`:

- Replace the direct `useCompetition(id)` dependency with a public event loader for the shared page.
- Keep using normal authenticated actions for registration submission.
- Ensure the error state distinguishes:
  - competition not found / not published,
  - backend error,
  - registration blocked by affiliate membership.

### 3. Add affiliate-aware registration gating
Create a small helper/hook for registration eligibility:

- Checks competition visibility and `gym_id`.
- Checks current user's profile and gym membership status.
- Returns one of:
  - `anonymous`
  - `allowed`
  - `needs_affiliate_request`
  - `pending_affiliate_approval`
  - `closed`

Use this in both:
- `/event/:id`
- `/competition/:id` Registration & Teams tab

### 4. Extract the existing registration wizard into a shared component
Move the current registration wizard logic from `CompetitionPublic.tsx` into:

`src/components/competition/RegisterForCompetitionCard.tsx`

It will handle:
- self vs other athlete
- individual vs team registration
- division selection
- age eligibility
- teammate slots
- duplicate registration checks
- team creation + team member registration
- already-registered state
- affiliate request / pending status state

Then use this component in:
- `CompetitionPublic.tsx`
- `RegistrationTeamsView.tsx`

### 5. Embed registration into Registration & Teams tab
In `src/components/competition/RegistrationTeamsView.tsx`:

- Place `<RegisterForCompetitionCard />` above the roster grid when registration is open.
- Keep the admin-only **Manage Registrations & Teams** collapsible as-is.
- Keep the small metric row at the bottom, as previously requested.
- If registration is closed, keep the read-only banner and roster only.

### 6. Clean up repeated profile fields
Adjust the registration card UX:

- If registering self and profile has display/full name, show it as read-only identity text instead of asking for name again.
- If profile is missing name, ask once and save it to the profile after successful self-registration.
- If date of birth is required for eligibility and profile is missing DOB, ask for it once and save it to the profile after successful self-registration.
- Leave `CreateProfile`/`ViewProfile` intact, but because registration now updates missing fields, those screens should hydrate with the values already provided.

## Files likely touched
- `src/pages/CompetitionPublic.tsx`
- `src/components/competition/RegistrationTeamsView.tsx`
- New: `src/components/competition/RegisterForCompetitionCard.tsx`
- New or updated data/helper module for public event loading and registration eligibility
- `src/modules/tournaments/api.ts` / hooks only if needed to separate public vs dashboard fetching
- Lovable Cloud migration for safe public event access

## What will not change
- No scoring changes.
- No leaderboard changes.
- No change to admin approval workflow.
- No change to draft/unpublished protection.
- No global weakening of dashboard competition visibility.
- No mock data.

## Acceptance checks
- Anonymous visitor opens shared `/event/:id` for an affiliate/private published competition and sees the public competition page.
- Anonymous visitor clicks register and is sent to signup/login, then returned to the same competition.
- Logged-in user without affiliate access sees the public page and can request affiliate access, but cannot register yet.
- Pending affiliate user sees pending status and cannot register yet.
- Active affiliate member can register from the public page.
- Signed-in user can register directly from `/competition/:id` → **Registration & Teams** without navigating away.
- Self-registration does not ask for name again when the profile already has it.
- Missing name/DOB entered during registration is saved back to profile where appropriate.