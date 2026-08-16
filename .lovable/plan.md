# Dashboard redesign — Steam-store style

The dashboard currently renders inside a narrow 512px column, so on a 1128px+ screen two thirds of the page is dead space. The fix is a real wide layout: a full-width featured area, horizontal carousels, and a right-hand rail — the way a store front page works.

## Layout

```text
+--------------------------------------------------------------+
|  header (logo · search · avatar · theme · sign out)           |
+--------------------------------------------------------------+
|  FEATURED  (large rotating competition hero, 16:9)   | RAIL   |
|  big poster, name, date, venue, CTA                  | you    |
|  thumbnail strip of the other 4 upcoming events      | quick  |
|                                                       actions |
+------------------------------------------------------+--------+
|  UPCOMING  — horizontal scroll row of event cards             |
|  PROGRAMS  — horizontal scroll row of program cards           |
|  GEAR      — marketplace teaser strip (honest "not open yet") |
+--------------------------------------------------------------+
```

## Responsive behaviour (mobile-first)

The layout is built mobile-first, then widened — the wide grid is a `lg` enhancement, not the baseline.

- **Mobile (<640px):** one column. Hero drops to a 4:3 poster with text stacked under it, thumbnail strip becomes swipe dots. Carousels stay horizontal swipe rows with snap and edge fade — no arrows, thumb-friendly. Right rail content moves inline: profile completion banner near the top, action list below the hero. Bottom nav and safe-area padding preserved; touch targets stay at least 44px.
- **Tablet (640–1024px):** two-up card rows, hero full width above the action list.
- **Desktop (≥1024px):** two-column grid (content + 320px rail), max width 1400px, centred with gutters.
- No fixed pixel widths or horizontal overflow at 320px; verified at 320/375/768/1280/1600.


## What changes

1. **Featured hero** — largest upcoming competition gets a full-bleed card: poster as background with a dark gradient scrim, name, date, host, and a primary "View event" button. Auto-rotates through up to 5 upcoming events every 7s, pausable on hover, with a clickable thumbnail strip underneath.
2. **Right rail** — compact identity card (avatar, name, tier), plus the menu items from `menu_items` rendered as a tight vertical action list instead of oversized 4-rem-tall tiles. Profile completion banner moves here.
3. **Horizontal carousels** — upcoming competitions and training programs become scroll rows of poster-first cards (poster on top, title, date, venue), snap scrolling, arrow buttons on desktop, edge-fade on mobile. Replaces the current stacked list.
4. **Marketplace / shop** — the two placeholder blocks (`BrowseMarketplaceSection`, `ShopSpotlight`) merge into one slim strip with the category chips and a single line of honest copy, no giant empty tile.
5. **Copy pass (humanizer-zh)** — strip the AI-flavoured filler: "What would you like to do today?", "Marketplace coming soon", "Quality martial arts apparel and equipment — coming soon.", "Follow structured programs, run guided workouts and track your progress." Replaced with short, concrete, human lines. No emoji in the greeting.
6. **Visual density** — Steam-like: darker page background than the cards, thin borders, hover lift on cards, poster imagery doing the work instead of icon-in-a-rounded-square. Uses existing tokens only (charcoal/red/green, Oswald + Inter), no new colours hardcoded.

## Technical notes

- Touched files: `src/pages/MainMenu.tsx` (layout shell), `src/components/dashboard/UpcomingCompetitionsSpotlight.tsx` (becomes a carousel), `BrowseMarketplaceSection.tsx` + `ShopSpotlight.tsx` (merged into one strip), `ProgramSpotlight.tsx` (becomes a program carousel fed by the existing programs API).
- New presentational components under `src/components/dashboard/`: `FeaturedCompetitionHero.tsx`, `DashboardRail.tsx`, `CardRow.tsx` (generic snap-scroll row).
- No changes to data access, RLS, feature flags, tier gating, or routing. Same queries; the programs row reuses `src/modules/programs/api.ts`.
- Homepage (`/`) untouched.
- Presentation only — all gating logic in `MainMenu.tsx` (`V1_FULL_ACCESS`, flags, `FEATURE_TIER_REQUIREMENT`, the collapsed Competitions entry) is carried over unchanged.
