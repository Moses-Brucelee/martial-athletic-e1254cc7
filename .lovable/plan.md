## Plan: Multi-feature improvements

### 1. Sponsor photo — disable auto background removal for PNGs
- Locate sponsor upload component (PosterUpload or sponsor-specific uploader).
- If file extension is `.png`, skip background removal step; otherwise keep current behavior.

### 2. Divisions — Team Size selector
- In Competition Dashboard → Divisions detail/edit panel, add a "Team Size" numeric selector (1–10).
- Persist to `competition_divisions.team_size` (add column via migration if missing).
- Registration page roster input must dynamically render exactly N name fields based on division's team_size.

### 3. Registration link page — hero poster clipping fix
- Inspect `CompetitionPublic.tsx` hero/poster rendering.
- Adjust container so AdaptivePoster maintains aspect ratio without clipping (use `object-contain` on small viewports or adjust max-height).

### 4. Workout reveal on registration page — make clickable
- On `CompetitionPublic.tsx`, workouts list shows a "reveal" toggle. Make each workout tile clickable to open a dialog/sheet showing the full workout (movements, scoring, time cap, notes).

### 5. Heat dropdown — hide already-assigned teams
- In Heat assignment UI (HeatLaneAssigner / HeatManagementPanel), filter team options to exclude teams already placed in that heat (or any heat for same workout/round, depending on existing logic).

### 6. For Time workouts — score input as mm:ss in leaderboard
- Where leaderboard displays For Time scores, format `time_seconds` as `mm:ss` (e.g., `5:24`).
- Workout breakdown table: detect `scoring_type === 'time'` per workout column and format accordingly.

### 7. Leaderboard score display — `score (placement)` format
- In LeaderboardPanel breakdown, each cell shows `score (Nth)` where N is team's rank for that workout.
- Compute per-workout rank using existing scoring logic (dense_rank by scoring_type direction).
- Use ordinal suffix (1st, 2nd, 3rd, …).

### Technical notes
- Migration: `ALTER TABLE competition_divisions ADD COLUMN IF NOT EXISTS team_size int NOT NULL DEFAULT 1;`
- New util: `formatTimeMMSS(seconds)`, `ordinal(n)` in `src/utils/`.
- Per-workout ranking computed client-side from `useScores` data, partitioned by `workout_id`, direction by `workout.scoring_type`.

### Files likely changed
- `src/components/competition/PosterUpload.tsx` (or sponsor upload component)
- `src/modules/tournaments/components/DivisionsPanel.tsx`
- `src/pages/CompetitionPublic.tsx`
- `src/modules/tournaments/components/HeatLaneAssigner.tsx`
- `src/modules/leaderboard/components/LeaderboardPanel.tsx`
- New: `src/utils/format.ts`
- New migration for `team_size`
# AI Poster Studio with Sponsor Logos & Background Removal

Extend the competition poster section so organizers can:

1. Upload a **hero image** (athlete, venue, action shot)
2. Upload up to **6 sponsor logos** (with one-click background removal so they sit cleanly on any backdrop)
3. Click **"✨ Generate Stunning Poster"** — Lovable AI (Gemini Nano Banana) composes a dramatic sports event poster combining hero + sponsors + competition title, date, venue
4. Pick a **style preset** (Bold / Minimal / Retro / Brutalist), preview, regenerate, then save as the official poster

Gated to **Affiliate Pro and above** (matches existing tier strategy).

## User flow

```text
Setup tab → Poster section
   │
   ├── Hero image           [upload]  ← optional "Remove background"
   ├── Sponsor logos (0–6)  [+ add]   ← auto background-removed on upload
   ├── Style preset         [Bold | Minimal | Retro | Brutalist]
   │
   ▼
[ ✨ Generate Stunning Poster ]
   │
   ▼
Preview: Original Hero  ↔  AI Poster
   │
   ├── [ Try another style ]
   ├── [ Regenerate ]
   └── [ Use this poster ] → saved as competition.poster_url
```

## Architecture

### 1. Storage layout (no DB migration needed for V1)
```
competition-posters/
  {competitionId}/
    hero.{ext}
    sponsor_1.png … sponsor_6.png      ← stored transparent after bg removal
    poster.{ext}                       ← final official poster
    ai_preview_{ts}.png                ← scratch previews, overwritten per gen
```

### 2. Background removal — client-side, free, instant
Use `@huggingface/transformers` (`Xenova/rmbg-1.4`) running in-browser via WebGPU/WASM. No API cost, no server round-trip.
- Triggered automatically on sponsor logo upload
- Optional "Remove background" button on hero image
- Falls back gracefully on unsupported browsers (skips removal, keeps original)
- New helper: `src/lib/removeBackground.ts`

### 3. New edge function: `supabase/functions/generate-poster/index.ts`
- **Input**: `{ competitionId, style: "bold"|"minimal"|"retro"|"brutalist" }`
- **Steps**:
  1. Validate JWT, confirm caller owns competition (`is_competition_owner`)
  2. Confirm tier ≥ `affiliate_pro` (`user_tier_at_least`)
  3. Rate-limit: 5 generations / hour / competition
  4. Fetch competition row (name, start_date, venue) + list hero & sponsor files
  5. Download files → base64
  6. Call Lovable AI Gateway → `google/gemini-2.5-flash-image` with multi-image input (hero as focal subject + sponsor logos as additional `image_url` parts)
  7. Save returned PNG to `ai_preview_{ts}.png`, return public URL
- **Errors surfaced to UI**: 429 (rate-limit), 402 (credits exhausted)

### 4. Style prompt templates
All prompts include: title, formatted date, venue, and "place sponsor logos in a clean horizontal strip at the bottom — even spacing, preserve original colors, no distortion".

- **Bold**: dramatic lighting, electric red & charcoal palette (matches brand), motion blur, oversized condensed type
- **Minimal**: heavy negative space, single accent color, thin geometric type
- **Retro**: 80s sports poster, halftone grain, neon
- **Brutalist**: massive blocky type, raw edges, monochrome high-contrast

### 5. Frontend changes

**Refactor `src/components/competition/PosterUpload.tsx`** into a 3-section panel:
- **Hero Image** — single slot, upload + optional bg-removal button
- **Sponsor Logos** — grid of 6 slots, each with upload/remove; auto bg-removal on upload with progress spinner
- **AI Poster Studio** (visible only to Affiliate Pro+ once hero exists):
  - Style preset dropdown
  - Generate button with loading state
  - Side-by-side preview (Original ↔ AI)
  - "Try another style" / "Regenerate" / "Use this poster"

**New helpers**:
- `src/lib/removeBackground.ts` — client-side bg removal via transformers.js
- `src/lib/posterAssets.ts` — `listSponsors / uploadSponsor / removeSponsor / setOfficialPoster(sourceUrl)`

**Tier gate**:
- Free / lower tiers → see hero upload only (current behavior preserved)
- Affiliate Pro+ → see sponsors + AI Studio
- Disabled state with tooltip if tier insufficient

### 6. Validation
- Hero & sponsor uploads: existing `validateImageFile` (jpg/png/webp/gif, ≤2MB)
- Helper text on sponsor slots: "Transparent PNG works best — we'll auto-remove background otherwise"
- Max 6 sponsors enforced client + server side

## Files

**New**
- `supabase/functions/generate-poster/index.ts`
- `src/lib/removeBackground.ts`
- `src/lib/posterAssets.ts`

**Modified**
- `src/components/competition/PosterUpload.tsx` — split into Hero / Sponsors / AI Studio
- `package.json` — add `@huggingface/transformers`

**No DB migration in V1.** A `competition_sponsors` table can be added later if per-sponsor metadata (link, tier rank) is needed.

## Cost & limits
- Background removal: free (runs in user's browser)
- AI poster generation: Lovable AI workspace credits, ~2–5s per call
- Rate-limited 5/hour/competition to prevent runaway usage
- Sponsors capped at 6 to keep AI input size predictable

## Out of scope (future)
- Sponsor tier ordering (gold/silver/bronze)
- Click-through links on public landing page
- Custom user-written prompts
- Saving multiple AI posters and picking from a gallery
