# Landing page rebuild, based on the shared reference

The home page becomes a full marketing page instead of the single short hero it is today. The reference screenshot sets the structure and rhythm. The colours stay exactly as they are now — charcoal background, red primary, green accent, Oswald headings, Inter body. Nothing from the reference's green-and-yellow palette carries over.

## What the page will contain

1. **Top bar** — logo on the left, short anchor links (Features, Competitions, Pricing, About) in the middle, Log in and Get started on the right. Collapses to logo plus the two buttons on mobile.
2. **Hero** — small red eyebrow line, a large two-line headline in the existing brand voice, one plain sentence underneath, two buttons (Get started, See a live event), and the circular Martial Athletic seal on the right. The current headline "Train Harder. Compete Smarter." is kept as the brand line.
3. **Numbers strip** — a narrow bordered band with four figures. These will be counted live from the database (published competitions, programs, registered athletes, affiliated gyms) so nothing on the page is invented. If a number is still zero, that tile is dropped rather than padded.
4. **What you get** — three feature blocks describing what the platform actually does: running a competition end to end, live scoring and leaderboards, and event visibility for athletes and sponsors.
5. **How it runs** — a short numbered sequence: create the event, open registration, score it live, publish results. This replaces the reference's testimonial section, since there are no real customer quotes yet.
6. **Pricing** — three plans pulled from the existing `pricing_tiers` table so the prices and feature lists match what the app actually charges. Middle plan marked as most popular, matching the reference layout.
7. **Closing band and footer** — one last call to action, then the existing links (Guide, Browse, Privacy, Terms, Sign in).

## Copy

Written plainly: short concrete sentences, varied length, no hype words, no three-item lists for the sake of symmetry, no em-dash reveals or emoji. Buttons name the action. Nothing claims a number or a testimonial the product cannot back up.

## Mobile

Single column below `lg`, tap targets at 44px and up, the numbers strip wraps to two columns, pricing cards stack with the popular plan first. Checked at 390px and 1280px, with fixes for anything that overflows.

## Technical notes

- All work in `src/pages/Index.tsx`, with new presentational sections split into `src/components/landing/`.
- Colours, radii and shadows come from the existing tokens in `index.css`. No new palette, no hardcoded colour utilities.
- Live figures and pricing come through read-only queries against existing tables; no schema changes, no new migrations.
- Existing SEO title and description stay; anchor links are in-page only, routes unchanged.
