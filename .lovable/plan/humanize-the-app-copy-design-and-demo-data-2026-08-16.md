# Humanize the app: copy, design, and demo data

Three passes over everything except the home page (`/`), which stays untouched.

## 1. Copy rewrite

Every page outside the home screen gets its text rewritten so it reads like a person wrote it — English, no language change.

What gets cut:
- Filler openers and hype ("seamless", "empower", "unlock", "elevate your training")
- Three-item lists that exist only to sound complete
- Em-dash reveals, bolded label lists, emoji headings
- Vague authority ("athletes report", "industry standard")
- Generic upbeat closers on empty states

What replaces it: short concrete lines, varied sentence length, plain verbs. Empty states say what to do next instead of apologising. Errors say what broke. Buttons say the action.

Pages in scope: dashboard, browse, competitions (list, create, detail, public, dashboard, workouts), programs and program detail, workout session, profile pages, members, affiliation, performances, gym website, guide, auth pages (login, register, forgot/reset password), invite response, unsubscribe, super dashboard, 404, privacy, terms, OAuth consent.

## 2. Design pass

Moderate — keep the existing charcoal/red/green identity and component library, change the rhythm so pages stop looking machine-assembled.

- Break the uniform card grid: mixed card sizes, some full-bleed rows, asymmetric section starts
- Section headings get real weight and off-grid placement instead of the same tiny uppercase label everywhere
- Remove the equal-padding-everywhere feel: tighter data areas, more air around focal points
- Replace generic icon-in-a-rounded-square tiles with typographic or numeric leads where it reads better
- Restrained motion: hover lift and row reveals only, no decorative animation

Mobile is verified per page: single column below `lg`, horizontal card rows stay swipeable, touch targets at 44px+, sticky primary actions on long forms, no horizontal overflow. I will screenshot key pages at 390px and 1280px and fix what breaks.

## 3. Synthetic data

Real rows in the database, every one flagged `is_synthetic` so a single cleanup removes them.

- 2 more marketplace apparel items, 2 more equipment items
- 3 more training programs with weeks, days, and workouts filled in
- 2 demo competitions: one published with divisions, workouts, teams, athletes, heats and scores so the leaderboard and heat sheet actually render; one upcoming with open registration
- Demo athlete/profile rows to populate rosters and leaderboards
- Extend the existing `is_synthetic` flag to any seeded table that lacks it

Everything seeded is visible to all viewers, so it will read as sample content, not as a fake user's private data.

## 4. Challenges going forward

Delivered as a short written summary at the end, covering what I hit while working: places where the data model blocks a nicer UI, pages carrying gating logic that is hard to reason about, and where mobile layout fights the desktop-first structure.

## Technical notes

- Copy changes are string edits inside existing components; no logic or route changes.
- Design changes stay in Tailwind classes and layout structure, using tokens from `index.css`. No hardcoded colour utilities.
- Seed data goes in one migration, with `GRANT` statements for any new table and RLS policies matching existing patterns.
- Work runs page group by page group so each batch can be reviewed.
