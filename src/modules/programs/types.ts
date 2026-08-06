// Training Programs module — types
// Templates (programs → weeks → days → workouts → sections → exercises)
// are strictly separated from execution records (sessions → exercise results).

export type ProgramStatus = "draft" | "published" | "archived";

export interface Program {
  id: string;
  created_by: string;
  gym_id: string | null;
  title: string;
  description: string | null;
  category: string;
  level: string;
  weeks_count: number;
  days_per_week: number;
  equipment: string[];
  cover_url: string | null;
  status: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProgramWeek {
  id: string;
  program_id: string;
  week_number: number;
  name: string | null;
  notes: string | null;
}

export interface ProgramDay {
  id: string;
  program_id: string;
  week_id: string;
  day_number: number;
  name: string | null;
  is_rest_day: boolean;
}

export interface ProgramWorkout {
  id: string;
  program_id: string;
  day_id: string;
  name: string;
  description: string | null;
  workout_format: string;
  format_config: Record<string, unknown>;
  est_duration_minutes: number | null;
  display_order: number;
  notes: string | null;
}

export interface WorkoutSection {
  id: string;
  program_id: string;
  workout_id: string;
  name: string;
  section_type: string;
  workout_format: string | null;
  format_config: Record<string, unknown>;
  display_order: number;
  notes: string | null;
}

export interface SectionExercise {
  id: string;
  program_id: string;
  section_id: string;
  movement_id: string | null;
  movement_name: string;
  sets: number | null;
  reps: number | null;
  reps_scheme: string | null;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: string | null;
  load: number | null;
  load_unit: string | null;
  load_percent: number | null;
  tempo: string | null;
  rest_seconds: number | null;
  notes: string | null;
  video_url: string | null;
  display_order: number;
}

export interface ProgramEnrollment {
  id: string;
  program_id: string;
  user_id: string;
  assigned_by: string | null;
  source: string;
  status: string;
  start_date: string;
  completed_at: string | null;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  program_id: string | null;
  enrollment_id: string | null;
  workout_id: string | null;
  title: string;
  status: string;
  scheduled_date: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
}

export interface ExerciseResult {
  id: string;
  session_id: string;
  user_id: string;
  exercise_id: string | null;
  movement_id: string | null;
  movement_name: string;
  set_number: number;
  reps: number | null;
  load: number | null;
  load_unit: string | null;
  time_seconds: number | null;
  distance: number | null;
  distance_unit: string | null;
  rpe: number | null;
  completed: boolean;
  skipped: boolean;
  notes: string | null;
  performed_at: string;
}

export interface Movement {
  id: string;
  name: string;
  category: string;
}

/** Full nested template tree used by the detail page and the player */
export interface ProgramTree extends Program {
  weeks: (ProgramWeek & {
    days: (ProgramDay & {
      workouts: (ProgramWorkout & {
        sections: (WorkoutSection & { exercises: SectionExercise[] })[];
      })[];
    })[];
  })[];
}

export interface SessionDetail {
  session: WorkoutSession;
  workout:
    | (ProgramWorkout & { sections: (WorkoutSection & { exercises: SectionExercise[] })[] })
    | null;
  results: ExerciseResult[];
}

// ── Library taxonomy ───────────────────────────────────────────────
export const PROGRAM_CATEGORIES = [
  { key: "strength", label: "Strength" },
  { key: "crossfit", label: "CrossFit" },
  { key: "weightlifting", label: "Weightlifting" },
  { key: "hyrox", label: "Hyrox" },
  { key: "functional", label: "Functional Fitness" },
  { key: "gymnastics", label: "Gymnastics" },
  { key: "running", label: "Running" },
  { key: "mobility", label: "Mobility" },
  { key: "endurance", label: "Endurance" },
] as const;

export const PROGRAM_LEVELS = [
  { key: "all", label: "All levels" },
  { key: "beginner", label: "Beginner" },
  { key: "intermediate", label: "Intermediate" },
  { key: "advanced", label: "Advanced" },
] as const;

export const SECTION_TYPES = [
  { key: "warmup", label: "Warm-up" },
  { key: "strength", label: "Strength" },
  { key: "accessory", label: "Accessory" },
  { key: "conditioning", label: "Conditioning" },
  { key: "cooldown", label: "Cooldown" },
] as const;

/**
 * Workout formats. `fields` drives progressive disclosure — the builder only
 * asks for what the chosen format genuinely needs.
 */
export const PROGRAM_WORKOUT_FORMATS = [
  { key: "standard", label: "Standard", fields: [] as const },
  { key: "amrap", label: "AMRAP", fields: ["duration_minutes", "rounds"] as const },
  { key: "emom", label: "EMOM", fields: ["minutes", "interval_seconds"] as const },
  { key: "for_time", label: "For Time", fields: ["time_cap_minutes", "rounds"] as const },
  { key: "tabata", label: "Tabata", fields: ["rounds", "work_seconds", "rest_seconds"] as const },
  { key: "interval", label: "Interval", fields: ["rounds", "work_seconds", "rest_seconds"] as const },
  { key: "countdown", label: "Countdown", fields: ["duration_minutes"] as const },
] as const;

export const FORMAT_FIELD_LABELS: Record<string, string> = {
  duration_minutes: "Duration (minutes)",
  time_cap_minutes: "Time cap (minutes)",
  minutes: "Minutes",
  interval_seconds: "Interval (seconds)",
  rounds: "Rounds",
  work_seconds: "Work (seconds)",
  rest_seconds: "Rest (seconds)",
};
