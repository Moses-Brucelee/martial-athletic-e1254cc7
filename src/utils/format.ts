/** Format seconds as mm:ss (e.g. 184 → "3:04"). Returns "—" for null/NaN. */
export function formatTimeMMSS(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || isNaN(Number(totalSeconds))) return "—";
  const s = Math.max(0, Math.round(Number(totalSeconds)));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** Convert a number to its ordinal form: 1 → "1st", 2 → "2nd", 23 → "23rd". */
export function ordinal(n: number): string {
  const v = Math.abs(n);
  const s = ["th", "st", "nd", "rd"];
  const mod100 = v % 100;
  return `${n}${s[(mod100 - 20) % 10] || s[mod100] || s[0]}`;
}
