import { z } from "zod";

// ── Reusable schemas ──────────────────────────────────────────────────

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be under 100 characters"),
  gender: z.string().min(1, "Please select a gender"),
  age: z.coerce.number({ invalid_type_error: "Age must be a number" }).int("Age must be a whole number").min(5, "Age must be at least 5").max(120, "Age must be under 120"),
  affiliation: z.string().max(100, "Affiliation must be under 100 characters").optional().or(z.literal("")),
  aboutMe: z.string().max(500, "About Me must be under 500 characters").optional().or(z.literal("")),
});

export const competitionSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be under 100 characters"),
  venue: z.string().max(200, "Venue must be under 200 characters").optional().or(z.literal("")),
  type: z.string().max(100, "Type must be under 100 characters").optional().or(z.literal("")),
  hostGym: z.string().max(100, "Host gym must be under 100 characters").optional().or(z.literal("")),
  divisions: z.string().max(200, "Divisions must be under 200 characters").optional().or(z.literal("")),
});

export const teamNameSchema = z.string().trim().min(1, "Team name is required").max(100, "Team name must be under 100 characters");

export const divisionNameSchema = z.string().trim().min(1, "Division name is required").max(100, "Division name must be under 100 characters");

export const athleteNameSchema = z.string().trim().min(1, "Athlete name is required").max(100, "Athlete name must be under 100 characters");

export const scoreSchema = z.coerce.number({ invalid_type_error: "Score must be a number" }).min(0, "Score cannot be negative").max(999999, "Score must be under 999,999");

export const seasonSchema = z.object({
  name: z.string().trim().min(2, "Season name must be at least 2 characters").max(100, "Season name must be under 100 characters"),
  year: z.coerce.number({ invalid_type_error: "Year must be a number" }).int().min(2000, "Year must be 2000 or later").max(2100, "Year must be before 2100"),
});

export const uuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Must be a valid UUID"
);

export const emailSchema = z.string().trim().email("Please enter a valid email address");

// ── Sanitization utilities ────────────────────────────────────────────

/** Trim whitespace and strip control characters */
export function sanitizeText(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/** Return a safe, user-friendly error message – never expose raw DB errors */
export function sanitizeError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((i) => i.message).join(". ");
  }
  // Generic message for all other errors
  return "Something went wrong. Please try again.";
}

// ── Image file validation ─────────────────────────────────────────────

export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"] as const;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

/** Returns an error message string, or null if the file is valid */
export function validateImageFile(file: File): string | null {
  if (file.size > MAX_IMAGE_SIZE) {
    return "Image must be under 2 MB";
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    return `Allowed image types: ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}`;
  }

  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return `Invalid file type. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}`;
  }

  return null;
}
