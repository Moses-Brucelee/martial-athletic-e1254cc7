/**
 * Calculate age in whole years from a date of birth relative to a reference date.
 *
 * @param dob        Date of birth
 * @param referenceDate  The date to calculate age against (e.g. competition start date).
 *                       Defaults to today.
 * @returns Age in whole years
 */
export function calculateAge(dob: Date, referenceDate: Date = new Date()): number {
  let age = referenceDate.getFullYear() - dob.getFullYear();
  const monthDiff = referenceDate.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Derive a human-readable age category label from competition config.
 */
export function getAgeCategoryLabel(
  type: string | null,
  minAge: number | null,
  maxAge: number | null,
): string {
  if (!type || type === "open") return "Open";
  if (type === "under_x" && maxAge != null) return `U${maxAge + 1}`;
  if (type === "age_range" && minAge != null && maxAge != null)
    return `${minAge}–${maxAge}`;
  if (type === "age_range" && minAge != null) return `${minAge}+`;
  return "Open";
}

/**
 * Check if an athlete's age (at a reference date) is eligible for a competition's
 * age category configuration.
 *
 * Returns null if eligible, or an error message string if not.
 */
export function checkAgeEligibility(
  dob: Date,
  competitionDate: Date,
  ageCategoryType: string | null,
  minAge: number | null,
  maxAge: number | null,
): string | null {
  if (!ageCategoryType || ageCategoryType === "open") return null;

  const age = calculateAge(dob, competitionDate);

  if (minAge != null && age < minAge) {
    return `Athlete is not eligible for this age category. Minimum age: ${minAge}, athlete age: ${age}.`;
  }
  if (maxAge != null && age > maxAge) {
    return `Athlete is not eligible for this age category. Maximum age: ${maxAge}, athlete age: ${age}.`;
  }

  return null;
}
