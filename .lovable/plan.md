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
