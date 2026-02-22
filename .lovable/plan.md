

# Security Hardening: Input Validation and Injection Protection

## Vulnerabilities Found

After auditing every form, data layer, and component, here are the security issues:

### 1. No Input Validation on Profile Forms

**CreateProfile.tsx** and **ViewProfile.tsx** accept arbitrary-length strings with no sanitization. Users can submit names with 10,000+ characters, script tags, or SQL-like payloads. No field-level validation exists.

### 2. No Input Validation on Competition Create

**CompetitionCreate.tsx** only checks if name is non-empty. No length limits, no trimming on venue/type/host_gym/divisions fields.

### 3. No Input Validation on Competition Child Panels

- **TeamsPanel.tsx**: Team name has no length limit or character restriction
- **DivisionsPanel.tsx**: Division name has no length limit
- **ParticipantsPanel.tsx**: Athlete name has no length limit
- **JudgesPanel.tsx**: Email search has no validation
- **ScoresPanel.tsx**: Score input accepts any number (negative, extremely large)
- **WorkoutsPanel.tsx**: No validation on workout data

### 4. No Validation on Super User Tools

- **ScoreOverride.tsx**: UUID fields not validated (accepts any string)
- **CompetitionManager.tsx**: Search input not sanitized (low risk since it's client-side filter)
- **SeasonManager.tsx**: Season name and year have no validation

### 5. ForgotPassword.tsx Has No Email Validation

Email field uses only HTML `required` attribute, no Zod schema validation.

### 6. Avatar File Extension Not Validated

Users can upload files with unexpected extensions (e.g., `.exe.jpg`). Only size is checked, not MIME type or extension whitelist.

### 7. Error Messages May Leak Internal Details

Raw error messages from the database are displayed to users (e.g., `err.message` from Supabase), which could reveal table names or constraint details.

---

## Implementation Plan

### File 1: `src/lib/validation.ts` (NEW)

Create a centralized validation library with reusable Zod schemas and sanitization utilities:

- `profileSchema`: name (2-100 chars, trimmed), gender (enum), age (5-120 integer), affiliation (max 100), aboutMe (max 500)
- `competitionSchema`: name (2-100 chars), venue (max 200), type (max 100), hostGym (max 100), divisions (max 200)
- `teamNameSchema`: 1-100 chars, trimmed
- `divisionNameSchema`: 1-100 chars, trimmed
- `athleteNameSchema`: 1-100 chars, trimmed
- `scoreSchema`: number, min 0, max 999999
- `seasonSchema`: name (2-100 chars), year (2000-2100 integer)
- `uuidSchema`: regex-validated UUID format
- `sanitizeText(input: string): string` -- trims and removes control characters
- `sanitizeError(error: unknown): string` -- returns user-friendly error message, never exposes raw DB errors
- `ALLOWED_IMAGE_EXTENSIONS`: whitelist of `['jpg', 'jpeg', 'png', 'gif', 'webp']`
- `validateImageFile(file: File): string | null` -- checks size, extension, and MIME type

### File 2: `src/pages/CreateProfile.tsx` (MODIFIED)

- Import and use `profileSchema` from validation library
- Add `fieldErrors` state for inline error messages under each field
- Validate on "Create" submit; skip button bypasses validation
- Add character counter on About Me (shows X/500)
- Use `sanitizeError` for error display
- Validate avatar with `validateImageFile` (extension + MIME type check)

### File 3: `src/pages/ViewProfile.tsx` (MODIFIED)

- Same validation as CreateProfile using `profileSchema`
- Add field-level error messages
- Use `sanitizeError` for error display
- Validate avatar with `validateImageFile`

### File 4: `src/pages/CompetitionCreate.tsx` (MODIFIED)

- Import and use `competitionSchema`
- Add field-level validation with inline errors
- Use `sanitizeError` for error display

### File 5: `src/components/competition/TeamsPanel.tsx` (MODIFIED)

- Validate team name with `teamNameSchema` before insert
- Show toast error for invalid input

### File 6: `src/components/competition/DivisionsPanel.tsx` (MODIFIED)

- Validate division name with `divisionNameSchema` before insert

### File 7: `src/components/competition/ParticipantsPanel.tsx` (MODIFIED)

- Validate athlete name with `athleteNameSchema` before insert

### File 8: `src/components/competition/ScoresPanel.tsx` (MODIFIED)

- Validate scores with `scoreSchema` before save (reject negatives, enforce max)
- Show toast for invalid scores

### File 9: `src/components/competition/JudgesPanel.tsx` (MODIFIED)

- Validate search input as email format before lookup

### File 10: `src/components/super/ScoreOverride.tsx` (MODIFIED)

- Validate workout ID and score ID with `uuidSchema` before API calls

### File 11: `src/components/super/SeasonManager.tsx` (MODIFIED)

- Validate season name and year with `seasonSchema`

### File 12: `src/pages/ForgotPassword.tsx` (MODIFIED)

- Add Zod email validation schema (matching Login page pattern)

---

## What This Does NOT Need to Change

- **Login.tsx** and **Register.tsx**: Already have Zod validation
- **ResetPassword.tsx**: Already has Zod validation
- **RLS policies**: Already hardened (database layer protects against injection regardless)
- **Supabase client**: Uses parameterized queries internally, so SQL injection via the SDK is not possible. The validation is defense-in-depth and protects against data corruption, XSS, and unexpected payloads.

## Security Notes

- SQL injection is not a direct risk because the Supabase JS SDK uses parameterized queries. However, input validation prevents data corruption, oversized payloads, and potential XSS if data is rendered without escaping.
- All validation is client-side defense-in-depth. The database RLS policies remain the authoritative enforcement layer.
- Error sanitization prevents leaking internal database structure to end users.

