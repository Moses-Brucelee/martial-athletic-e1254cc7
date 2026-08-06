// Timer engine — the timer mode is derived entirely from workout metadata.
// Nothing here is hardcoded per workout; callers pass `workout_format` +
// `format_config` and get a fully described timer spec back.

export type TimerMode =
  | "stopwatch"
  | "countdown"
  | "amrap"
  | "emom"
  | "for_time"
  | "tabata"
  | "interval"
  | "rest";

export interface TimerSpec {
  mode: TimerMode;
  label: string;
  /** Counts up (stopwatch style) or down */
  direction: "up" | "down";
  /** Total duration in seconds, when bounded */
  totalSeconds: number | null;
  /** Length of one repeating interval, when the mode repeats */
  intervalSeconds: number | null;
  /** Work / rest split for interval-style modes */
  workSeconds: number | null;
  restSeconds: number | null;
  rounds: number | null;
}

function num(cfg: Record<string, unknown> | null | undefined, key: string): number | null {
  const v = cfg?.[key];
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Derive a timer spec from workout metadata.
 * Unknown / missing formats fall back to a stopwatch so the player always works.
 */
export function deriveTimer(
  format: string | null | undefined,
  config?: Record<string, unknown> | null,
): TimerSpec {
  const cfg = config ?? {};
  const base: TimerSpec = {
    mode: "stopwatch",
    label: "Stopwatch",
    direction: "up",
    totalSeconds: null,
    intervalSeconds: null,
    workSeconds: null,
    restSeconds: null,
    rounds: null,
  };

  switch ((format ?? "").toLowerCase()) {
    case "amrap": {
      const mins = num(cfg, "duration_minutes") ?? num(cfg, "minutes") ?? 12;
      return {
        ...base,
        mode: "amrap",
        label: `AMRAP ${mins} min`,
        direction: "down",
        totalSeconds: mins * 60,
        rounds: num(cfg, "rounds"),
      };
    }
    case "emom": {
      const mins = num(cfg, "minutes") ?? 10;
      const interval = num(cfg, "interval_seconds") ?? 60;
      return {
        ...base,
        mode: "emom",
        label: `EMOM ${mins} min`,
        direction: "down",
        totalSeconds: mins * 60,
        intervalSeconds: interval,
        rounds: Math.max(1, Math.round((mins * 60) / interval)),
      };
    }
    case "for_time": {
      const cap = num(cfg, "time_cap_minutes");
      return {
        ...base,
        mode: "for_time",
        label: cap ? `For Time (cap ${cap} min)` : "For Time",
        direction: cap ? "down" : "up",
        totalSeconds: cap ? cap * 60 : null,
        rounds: num(cfg, "rounds"),
      };
    }
    case "tabata": {
      const rounds = num(cfg, "rounds") ?? 8;
      const work = num(cfg, "work_seconds") ?? 20;
      const rest = num(cfg, "rest_seconds") ?? 10;
      return {
        ...base,
        mode: "tabata",
        label: `Tabata ${rounds} x ${work}/${rest}s`,
        direction: "down",
        totalSeconds: rounds * (work + rest),
        intervalSeconds: work + rest,
        workSeconds: work,
        restSeconds: rest,
        rounds,
      };
    }
    case "interval": {
      const rounds = num(cfg, "rounds") ?? 5;
      const work = num(cfg, "work_seconds") ?? 60;
      const rest = num(cfg, "rest_seconds") ?? 60;
      return {
        ...base,
        mode: "interval",
        label: `${rounds} x ${work}s / ${rest}s`,
        direction: "down",
        totalSeconds: rounds * (work + rest),
        intervalSeconds: work + rest,
        workSeconds: work,
        restSeconds: rest,
        rounds,
      };
    }
    case "countdown": {
      const mins = num(cfg, "duration_minutes") ?? 5;
      return {
        ...base,
        mode: "countdown",
        label: `${mins} min countdown`,
        direction: "down",
        totalSeconds: mins * 60,
      };
    }
    default:
      return base;
  }
}

/**
 * Timer for a single exercise, derived from its own definition:
 * a timed exercise gets a countdown, everything else a stopwatch.
 */
export function deriveExerciseTimer(exercise: {
  duration_seconds?: number | null;
  distance?: number | null;
}): TimerSpec | null {
  if (exercise.duration_seconds && exercise.duration_seconds > 0) {
    return {
      mode: "countdown",
      label: "Work",
      direction: "down",
      totalSeconds: exercise.duration_seconds,
      intervalSeconds: null,
      workSeconds: null,
      restSeconds: null,
      rounds: null,
    };
  }
  return null;
}

export function restTimer(seconds: number): TimerSpec {
  return {
    mode: "rest",
    label: "Rest",
    direction: "down",
    totalSeconds: seconds,
    intervalSeconds: null,
    workSeconds: null,
    restSeconds: null,
    rounds: null,
  };
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
