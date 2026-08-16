# Social sign-up + locked identity fields

Goal: let people sign up with Google, auto-fill what Google gives us (name, avatar, email), ask for the rest once, and then lock the identity fields (date of birth, age, gender, full/legal name). Support (super-users) can unlock a profile when someone made a mistake.

## 1. Google sign-up enrichment

- Google returns only: full name, given/family name, profile picture, email. It does not return date of birth or gender.
- On first login after a Google sign-up, prefill the profile from the Google identity: full name, display name, and avatar image (copied into our own avatar storage so it does not break if the Google URL expires).
- The setup screen then only asks for what is genuinely missing (date of birth, gender, gym, about me) and shows the Google-supplied values as pre-filled.
- Google sign-in already exists on Login and Register; Apple/iCloud is deliberately out of scope for now.

## 2. Lock identity fields after completion

Once a profile is marked complete, these become read-only everywhere in the app:

- Date of birth (and the derived age)
- Gender
- Full / legal name

Display name, avatar, gym affiliation and about-me stay editable.

Locked fields are shown as plain text with a small lock icon and the hint "Locked — contact support to change". Enforcement is not just UI: the database rejects changes to those columns once the profile is locked, so it cannot be bypassed from the browser.

## 3. Support unlock (super-users)

In the super dashboard user management, add an "Unlock identity fields" action per user. It clears the lock so the athlete can correct their details on their next visit, and the profile re-locks automatically once they save again. Each unlock is written to the existing audit trail.

## Technical notes

- Migration:
  - Add `identity_locked_at timestamptz` and `identity_unlocked_by uuid` to `public.profiles`.
  - Trigger `enforce_profile_identity_lock` on `profiles` BEFORE UPDATE: if `identity_locked_at IS NOT NULL` and the caller is not a super-user, revert any change to `date_of_birth`, `age`, `gender`, `full_name` to the old value (raise a clear exception instead of silently ignoring).
  - Trigger sets `identity_locked_at = now()` when `profile_completed` flips to true and the lock is null.
  - Security-definer RPC `admin_unlock_profile_identity(p_user_id uuid)` guarded by `is_super_user(auth.uid())`; clears `identity_locked_at`, records `identity_unlocked_by`, and logs to `competition_audit_events`-style audit (reuse existing super-user audit path).
  - `handle_new_user` extended to also seed `full_name` and `avatar_url` from `raw_user_meta_data` keys `full_name` / `name` / `picture` / `avatar_url` for OAuth signups.
- Client:
  - New `src/lib/socialProfile.ts`: reads `user.user_metadata` / `identities`, returns normalized `{ fullName, displayName, avatarUrl, provider }`; a one-time hydration step (run from `CreateProfile`) fetches the Google picture and uploads it through the existing `processAvatarFile` + `avatars` bucket path.
  - `src/hooks/useProfile.ts` and `src/modules/auth/types.ts`: add `identity_locked_at`.
  - New helper `isIdentityLocked(profile)` and `LOCKED_IDENTITY_FIELDS` in `src/lib/profileCompletion.ts`.
  - `src/pages/CreateProfile.tsx`: render DOB / gender / full name as read-only locked rows when locked; strip those keys from the update payload; show provider badge ("Details from your Google account") when values came from OAuth.
  - `src/pages/ViewProfile.tsx`: same locked treatment on the edit path.
  - `src/components/super/SuperUserManager.tsx`: add the unlock action calling the new RPC.
- No change to Login/Register layout beyond wording; Google button stays as is.
