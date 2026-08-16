# Fix: public event page fails to load

## What's actually happening

The page is not crashing because of missing competition data. Every public (signed-out) read of the competition is being rejected by the database.

Verified by calling the public API as an anonymous visitor for this event:

```text
GET /competitions?id=eq.d7385d47-...
-> 42501 permission denied for function is_super_user
```

The same error comes back for divisions, teams and workouts. The security rules on those tables call helper functions (`is_super_user`, `is_competition_owner`, `is_competition_judge`, `has_competition_access`, `is_gym_owner`), and the anonymous role was never granted permission to run them. Signed-in users have that permission, which is why the event page works for you when logged in and dies for everyone else opening the share link.

So the frontend does the right thing: the fetch returns an error, and it shows "Unable to load competition".

## Fix

1. Database migration granting execute permission on the read-only helper functions to the anonymous role: `is_super_user`, `is_competition_owner`, `is_competition_judge`, `has_competition_access`, `is_gym_owner`, `increment_sponsor_click`. These take a user id and return a boolean; for an anonymous visitor they simply evaluate to false, so no data becomes visible that the policies don't already allow. Only the policy evaluation stops erroring.
2. Re-verify with anonymous requests against competitions, divisions, teams and workouts for this event id, and load `/event/<id>?register=1` in a signed-out browser to confirm the page and registration wizard render.

## Better failure handling on the page

- Show the underlying reason when the load fails (permission vs. network vs. not found) instead of one generic message, and add a "Try again" button that refetches rather than only "Go Home".
- If competition data loads but divisions fail, keep the page up and disable registration with a clear notice instead of blanking the screen.

## Publish-time validation

Extend the existing publish checklist (`statusValidation.ts`) so an organizer cannot publish an event that would give visitors a broken page:

- Blocker: at least one division exists (already enforced).
- Blocker: start date set (already enforced).
- New blocker: registration deadline set when the event is publicly registrable, and it must be before the start date.
- New warning: no workouts, no venue, no poster.
- New post-publish self-check: after publishing, run a public visibility probe for the event and warn the organizer if the public page is not reachable, so a permission regression is caught immediately instead of by an athlete.

## Technical notes

- Migration only adds `GRANT EXECUTE ... TO anon` on the listed functions. No policy, table or column changes.
- Frontend changes limited to `src/pages/CompetitionPublic.tsx` (error states) and `src/modules/tournaments/statusValidation.ts` plus its dialog in `CompetitionStatusActions.tsx`.
