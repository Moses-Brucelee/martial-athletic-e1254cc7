/**
 * Profile completion model.
 *
 * A single source of truth for what counts as a "complete" profile so that
 * the dashboard banner, the CreateProfile screen, and the just-in-time
 * `useRequireProfileFields` hook all agree.
 *
 * Required fields are intentionally minimal — the user can register and use
 * the app immediately and progressively fill the rest in later.
 */

export type ProfileFieldKey =
  | "display_name"
  | "gender"
  | "date_of_birth"
  | "affiliation"
  | "about_me"
  | "avatar_url";

export interface ProfileFieldDef {
  key: ProfileFieldKey;
  label: string;
  /** Whether this field counts towards `profile_completed`. */
  required: boolean;
  /** UI hint about what kind of input the field uses. */
  inputKind: "text" | "textarea" | "select" | "date";
}

export const PROFILE_FIELD_DEFS: ProfileFieldDef[] = [
  { key: "display_name", label: "Display name",         required: true,  inputKind: "text" },
  { key: "gender",       label: "Gender",               required: true,  inputKind: "select" },
  { key: "date_of_birth",label: "Date of birth",        required: true,  inputKind: "date" },
  { key: "affiliation",  label: "Gym / club",           required: false, inputKind: "text" },
  { key: "about_me",     label: "About me",             required: false, inputKind: "textarea" },
  { key: "avatar_url",   label: "Profile photo",        required: false, inputKind: "text" },
];

export const REQUIRED_PROFILE_FIELDS: ProfileFieldKey[] = PROFILE_FIELD_DEFS
  .filter((f) => f.required)
  .map((f) => f.key);

export type ProfileLike = Partial<Record<ProfileFieldKey, unknown>>;

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

/** Returns the subset of `fields` that are currently empty on the profile. */
export function missingProfileFields(
  profile: ProfileLike | null | undefined,
  fields: ProfileFieldKey[] = REQUIRED_PROFILE_FIELDS,
): ProfileFieldKey[] {
  if (!profile) return [...fields];
  return fields.filter((k) => !isFilled(profile[k]));
}

/** True when every required field is filled. Pure function — safe for triggers. */
export function isProfileComplete(profile: ProfileLike | null | undefined): boolean {
  return missingProfileFields(profile, REQUIRED_PROFILE_FIELDS).length === 0;
}

export function getFieldDef(key: ProfileFieldKey): ProfileFieldDef | undefined {
  return PROFILE_FIELD_DEFS.find((f) => f.key === key);
}
