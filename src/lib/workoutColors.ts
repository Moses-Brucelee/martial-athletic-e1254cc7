/**
 * Deterministic per-workout color tokens.
 * Returns inline style objects using HSL so they work with the design system
 * without requiring new Tailwind tokens. Same workout_id → same color across the app.
 */

const PALETTE = [
  { h: 0,   s: 85, l: 58 }, // electric red
  { h: 142, s: 70, l: 45 }, // neon green
  { h: 38,  s: 95, l: 55 }, // amber
  { h: 210, s: 90, l: 58 }, // electric blue
  { h: 280, s: 70, l: 60 }, // violet
  { h: 175, s: 75, l: 45 }, // teal
  { h: 320, s: 75, l: 60 }, // magenta
  { h: 25,  s: 90, l: 55 }, // orange
  { h: 95,  s: 65, l: 50 }, // lime
  { h: 195, s: 85, l: 50 }, // cyan
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
      bg: "hsl(0 0% 60% / 0.15)",
      border: "hsl(0 0% 60% / 0.45)",
      text: "hsl(0 0% 80%)",
      solid: "hsl(0 0% 60%)",
    };
  }
  const c = PALETTE[hashId(workoutId) % PALETTE.length];
  const base = `${c.h} ${c.s}% ${c.l}%`;
  return {
    hsl: base,
    bg: `hsl(${base} / 0.15)`,
    border: `hsl(${base} / 0.5)`,
    text: `hsl(${c.h} ${c.s}% ${Math.min(c.l + 15, 80)}%)`,
    solid: `hsl(${base})`,
  };
}
