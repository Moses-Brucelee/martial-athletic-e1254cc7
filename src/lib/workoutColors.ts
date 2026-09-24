/**
 * Deterministic per-workout colour tokens built from the shared Martial Athletic
 * palette: red, neutral greys and black/white shades only. Workouts stay
 * distinguishable through lightness steps plus their WOD label, not rainbow hues.
 * Same workout_id → same tone across the app.
 */

const PALETTE = [
  { h: 0, s: 85, l: 55 }, // electric red
  { h: 0, s: 0, l: 85 },  // near white
  { h: 0, s: 60, l: 40 }, // deep red
  { h: 0, s: 0, l: 60 },  // mid grey
  { h: 0, s: 70, l: 70 }, // light red
  { h: 0, s: 0, l: 40 },  // dark grey
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getWorkoutColor(workoutId: string | null | undefined) {
  if (!workoutId) {
    return {
      hsl: "0 0% 60%",
      bg: "hsl(0 0% 60% / 0.12)",
      border: "hsl(0 0% 60% / 0.4)",
      text: "hsl(0 0% 75%)",
      solid: "hsl(0 0% 60%)",
    };
  }
  const c = PALETTE[hashId(workoutId) % PALETTE.length];
  const base = `${c.h} ${c.s}% ${c.l}%`;
  return {
    hsl: base,
    bg: `hsl(${base} / 0.14)`,
    border: `hsl(${base} / 0.5)`,
    text: `hsl(${c.h} ${c.s}% ${Math.max(Math.min(c.l + 10, 85), 60)}%)`,
    solid: `hsl(${base})`,
  };
}
