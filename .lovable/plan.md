## Goal

On the Competition Dashboard → Registration & Teams tab, stop rendering the full inline registration wizard. Instead, show a compact card with a "Register now" button that routes the user to the public event page (`/event/:id`), where they go through the existing affiliate/signup/registration journey.

## Changes

**Edit `src/components/competition/RegistrationTeamsView.tsx`**
- Remove the `<RegisterForCompetitionCard />` usage at the top of the view.
- Replace it with a small inline CTA card (only when `registrationOpen` is true) containing:
  - Title: "Register for this competition"
  - Short helper text: "Complete your registration on the event page."
  - Primary button "Register now" that navigates to `/event/{competitionId}` via `react-router-dom`'s `useNavigate`.
- Keep the existing "Registrations are closed" banner for the closed state.
- Keep the admin "Manage Registrations & Teams" collapsible panel unchanged.
- Leave grouped divisions/teams/solo athletes list and summary metrics unchanged.

**No other files changed.**
- `RegisterForCompetitionCard.tsx` stays in place (still used by other flows / can be reused later); just unimport it from this view.
- Public `/event/:id` page already handles affiliate gating, sign-up redirection, and the full registration flow — no changes needed there.
- No backend, RLS, or data changes.

## Out of scope

- Affiliate gating logic, signup flow, RLS, and the public event page behavior remain exactly as they are.
