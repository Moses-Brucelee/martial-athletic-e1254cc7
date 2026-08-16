# Merge the two competition menu cards

## What's happening

Confirmed: both dashboard cards point to the same place.

- "VIEW COMPETITIONS" (`view_leaderboards`) → `/competitions`
- "VIEW / BUILD YOUR COMP" (`create_competitions`) → `/competitions` (or `/competition/create` when you have none yet)

Same destination, two rows. That's the duplication you circled.

## The fix

Show a single Competitions card on the dashboard, with wording that adapts to what the user can do:

- Organizers/affiliates (have competition-creation access):
  - Label: COMPETITIONS
  - Description: "Browse events, build and run your own"
  - Tap → `/competitions` (or straight to `/competition/create` if they have no competitions yet, same as today)
- Athletes/free users (no creation access):
  - Label: COMPETITIONS
  - Description: "Browse events and live leaderboards"
  - Tap → `/competitions`

Result: one clear entry point, no lost functionality, no extra clicks for organizers.

## Technical notes

- In `src/pages/MainMenu.tsx`, collapse the two menu items during the `accessibleItems` build: when `create_competitions` survives the flag/tier filters, drop `view_leaderboards`; otherwise keep `view_leaderboards` and relabel it.
- Apply the unified label/description in the same mapping step, replacing the current ad-hoc relabel at line 124 and the `displayLabel` override in the render.
- No database changes — `menu_items` rows stay as they are, so nothing else that reads them is affected.
- Icon: keep the Trophy icon for the merged card (it reads as competitions better than the Eye icon).
