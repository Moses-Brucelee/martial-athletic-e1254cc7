# Add the missing Google sign-up / sign-in button

You are not missing anything — the button genuinely is not on screen.

## What's actually wrong

A `GoogleSignInButton` component exists and is fully written (Google logo, OAuth call, error handling). Both `Login.tsx` and `Register.tsx` import it, but neither page ever renders it — the import is there, the button is not. So the whole social sign-up path added earlier is unreachable from the UI.

Separately, the Google provider still needs to be switched on for the backend, otherwise the first click would fail with an "unsupported provider" error.

## What will change

1. Render the Google button on the Register page, above the email/password form, with an "or continue with email" divider beneath it. Label: "Sign up with Google".
2. Render the same button on the Login page in the same position. Label: "Continue with Google".
3. Preserve the intended destination: if the user arrived at Login/Register with a `redirectTo` (for example from a competition invite), keep passing it through so they land where they meant to go after Google returns them.
4. Enable the Google provider on the backend in the same change, so the button works the moment it appears.

After this, a new user who taps "Sign up with Google" is returned signed in, lands on the profile setup screen with their name and photo already filled in from Google, and only has to supply date of birth, gender and gym — which is the behaviour the last change built but nobody could reach.

## Technical notes

- Edit `src/pages/Register.tsx` and `src/pages/Login.tsx` only: render `<GoogleSignInButton />` plus a divider; no logic changes to the existing email/password submit handlers.
- Pass the existing `redirectTo` search param into the button's `redirectTo` prop; it already appends it to `window.location.origin`, which stays a valid same-origin public URL.
- Call the Configure Social Login tool for `google` in the same turn as the code change (managed Lovable Cloud credentials, no keys required from you).
- No database or RLS changes.
