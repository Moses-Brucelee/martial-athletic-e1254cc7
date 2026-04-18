
The user wants feature flags layered on top of the staging/prod split. They want runtime toggles so half-baked features can stay hidden in prod but visible in staging — without code changes per release.

Existing pattern: `src/lib/featureFlags.ts` already has `V1_FULL_ACCESS`. That's a single hardcoded boolean — not enough. We need per-feature, per-environment, ideally runtime-editable toggles.

Three architectural options, increasing in power:
1. **Static flags in code** — fast, free, but every toggle = code change + redeploy
2. **Env-based flags** (Vite `.env`) — different values per project (staging vs prod), still requires redeploy to flip
3. **DB-backed flags** (Cloud table + admin UI) — flip live without redeploy, super-user toggles in /super-dashboard

Recommend a hybrid: env-based defaults + DB override. Best DX without overengineering.

Keep the plan tight and decision-focused.

# Plan: Feature Flag System (paired with staging/prod)

## Strategy: Hybrid flags — env defaults + DB live overrides

Layer feature flags in three tiers, each overriding the previous:

```text
Tier 1: Code default        (src/lib/featureFlags.ts — safe fallback)
   ↓ overridden by
Tier 2: Env variable        (VITE_FF_* in .env — set per Lovable project)
   ↓ overridden by
Tier 3: DB row (live)       (feature_flags table — flip without redeploy)
```

This gives you: safe defaults in code, different baselines per environment (staging shows everything, prod hides half-baked stuff), and emergency live toggles from the Super Dashboard.

## What gets built

### 1. `feature_flags` table (Cloud)
```text
key            text PK   e.g. "members_management", "affiliation_network"
enabled        bool      live override; null = use env/code default
audience       text      "all" | "super_users" | "organizers" | "beta"
description    text      human label for admin UI
updated_at     timestamptz
```
RLS: SELECT for all authenticated; UPDATE only super users.

### 2. `useFeatureFlag(key)` hook
Resolves a flag in priority order: DB → env → code default. Cached via React Query (1 min stale). Always returns `true` if user is super user (so you can preview hidden features in prod).

### 3. `<FeatureGate flag="x">...</FeatureGate>` component
Wraps any UI section. Hides children when flag is off. Optional `fallback` for "Coming soon" placeholder.

### 4. Admin UI in `/super-dashboard`
New "Feature Flags" tab: list all flags with on/off toggle, audience selector, last-updated timestamp. Flipping a switch = instant effect for all users (after their next refetch).

### 5. Initial flag catalog
Seed flags for everything currently half-baked. Based on the codebase, candidates:
- `members_management` (`/members`)
- `affiliation_network` (`/affiliation`)
- `gym_website_builder` (`/gym-website`)
- `performances_analytics` (`/performances`)
- `browse_marketplace` (`/browse`)
- `seasons` (season leaderboards)
- `brackets` (tournament brackets)
- `whiteboard_mode`
- `competition_templates`
- `share_qr_code`
- `share_social_buttons` (X/FB/LinkedIn)

You decide which start `enabled=false` in prod. Staging starts all `true`.

### 6. Hide vs disable strategy
- **Menu items** (MainMenu): filter out hidden features completely — user never sees them.
- **Routes**: gated routes redirect to `/dashboard` if flag off (prevents direct URL access).
- **In-page sections** (e.g. a tab inside competition dashboard): hide tab + content.
- **Super users**: always see everything, with a small "🚧 Hidden flag" badge so they know what's live vs gated.

## Pairing with staging/prod

| Environment | Default behavior | How to override |
|---|---|---|
| **Staging** | All flags ON via `.env` (`VITE_FF_DEFAULT=true`) | Test everything end-to-end |
| **Production** | Half-baked flags OFF in `feature_flags` table | Flip ON from /super-dashboard when ready |

Promotion workflow becomes:
1. Build feature on staging branch → test with flag ON
2. Merge to `main` → code deploys to prod with flag still **OFF** in prod DB
3. Smoke test in prod as super user (you see it; users don't)
4. Flip flag to ON in /super-dashboard → instant release, no redeploy
5. If broken, flip OFF instantly — no rollback needed

## Files to create/modify
- **New** `src/lib/featureFlags.ts` (expand existing) — flag keys + defaults registry
- **New** `src/hooks/useFeatureFlag.ts` — resolution + React Query
- **New** `src/components/FeatureGate.tsx` — declarative wrapper
- **New** `src/components/super/FeatureFlagsManager.tsx` — admin toggle UI
- **Migration** create `feature_flags` table + RLS + seed rows
- **Modified** `src/pages/MainMenu.tsx` — filter menu items by flag
- **Modified** `src/App.tsx` — gate routes
- **Modified** `src/pages/SuperDashboard.tsx` — add "Feature Flags" tab

## Decisions I need before building
1. **Which features should be OFF in prod for v1 launch?** (I'll suggest a default list, you confirm/edit)
2. **Granularity**: page-level only (e.g. hide `/members`), or also sub-section level (e.g. hide just the "Affiliation" tab inside members)?
3. **Audience targeting**: do you want per-flag audience (`all` / `super_users` / `beta_testers`), or just on/off is enough for v1?
4. **"Coming soon" placeholders**: when a feature is hidden, show nothing, or show a teaser card ("Coming soon — Q2")?

Once you answer these (or say "use sensible defaults"), I'll implement everything in one pass.
