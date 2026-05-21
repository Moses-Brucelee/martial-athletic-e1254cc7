import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TimeInputProps {
  /** Total seconds as string (matches the rest of the scoring pipeline). */
  value: string;
  onChange: (totalSeconds: string) => void;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
}

function parse(total: string) {
  const n = Math.max(0, Math.floor(Number(total) || 0));
  return {
    h: Math.floor(n / 3600),
    m: Math.floor((n % 3600) / 60),
    s: n % 60,
  };
}

/** Three-segment HH : MM : SS input. Emits the total seconds as a string. */
export function TimeInput({
  value,
  onChange,
  className,
  inputClassName,
  disabled,
  size = "md",
  showLabels = false,
}: TimeInputProps) {
  const { h, m, s } = parse(value);

  const emit = (nh: number, nm: number, ns: number) => {
    const safe = (v: number, max: number) => Math.min(Math.max(0, v || 0), max);
    const total = safe(nh, 99) * 3600 + safe(nm, 59) * 60 + safe(ns, 59);
    onChange(String(total));
  };

  const heights = { sm: "h-9", md: "h-12", lg: "h-14" };
  const fonts = { sm: "text-sm", md: "text-base", lg: "text-2xl" };

  const inputCls = cn(
    "text-center font-bold tabular-nums bg-background",
    heights[size],
    fonts[size],
    inputClassName,
  );

  const Field = ({ val, max, onVal, label }: { val: number; max: number; onVal: (n: number) => void; label: string }) => (
    <div className="flex flex-col items-center gap-0.5">
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={String(val).padStart(2, "0")}
        onChange={(e) => onVal(Number(e.target.value))}
        disabled={disabled}
        className={inputCls}
        aria-label={label}
      />
      {showLabels && (
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{label}</span>
      )}
    </div>
  );

  return (
    <div
      className={cn("inline-flex items-start gap-1", className)}
      title="Enter time as HH:MM:SS (hours 0–99, minutes 0–59, seconds 0–59)"
      aria-label="Time input in hours, minutes, seconds"
    >
      <Field val={h} max={99} onVal={(n) => emit(n, m, s)} label="hrs" />
      <span className={cn("font-black text-muted-foreground self-center", showLabels ? "mb-3" : "")}>:</span>
      <Field val={m} max={59} onVal={(n) => emit(h, n, s)} label="min" />
      <span className={cn("font-black text-muted-foreground self-center", showLabels ? "mb-3" : "")}>:</span>
      <Field val={s} max={59} onVal={(n) => emit(h, m, n)} label="sec" />
    </div>
  );
}

/** Format total seconds for display: H:MM:SS or M:SS. */
export function formatSecondsDisplay(total: string | number): string {
  const n = Math.max(0, Math.floor(Number(total) || 0));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
