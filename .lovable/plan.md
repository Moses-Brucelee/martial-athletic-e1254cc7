

# Auto-Calculate Age from Date of Birth

## Summary

Remove the manual age input field and automatically compute age from the selected date of birth. The computed age will be displayed as a read-only value and saved to the database alongside the DOB.

---

## Changes

### 1. Update validation schema (`src/lib/validation.ts`)

- Remove `age` from the `profileSchema` (no longer user-entered)
- Add optional `dateOfBirth` field to the schema instead
- Age becomes a derived value, not a validated input

### 2. Add age calculation helper

Create a `calculateAge(dob: Date): number` utility function (in `validation.ts` or inline) that computes age in whole years from a given date of birth relative to today.

### 3. Update `CreateProfile.tsx`

- Remove the `age` state variable and its manual input field
- Compute age on the fly: `const computedAge = dateOfBirth ? calculateAge(dateOfBirth) : null`
- Display computed age as a read-only text field next to the DOB picker (e.g., "Age: 28")
- On save, persist `computedAge` to the `age` column in the database
- Update validation references to remove `age` from `profileSchema.safeParse()`

### 4. Update `ViewProfile.tsx`

- Same changes as CreateProfile: remove manual age input, show computed read-only age
- Remove `age` state variable
- Compute age from `dateOfBirth` state
- On save, persist computed age to the `age` column

### 5. Database

No migration needed -- the existing `age` (integer) and `date_of_birth` (date) columns both stay. The `age` column will now be written by the frontend based on DOB calculation rather than manual entry.

---

## Technical Detail

**Age calculation logic:**
```text
function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}
```

**UI change:** The Age field becomes a read-only display showing "Age: 28" (or empty if no DOB selected), positioned next to the DOB picker in the same grid row.

