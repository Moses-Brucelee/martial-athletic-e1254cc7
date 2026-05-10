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

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={99}
        value={String(h).padStart(2, "0")}
        onChange={(e) => emit(Number(e.target.value), m, s)}
        disabled={disabled}
        className={inputCls}
        aria-label="Hours"
      />
      <span className="font-black text-muted-foreground">:</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={59}
        value={String(m).padStart(2, "0")}
        onChange={(e) => emit(h, Number(e.target.value), s)}
        disabled={disabled}
        className={inputCls}
        aria-label="Minutes"
      />
      <span className="font-black text-muted-foreground">:</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={59}
        value={String(s).padStart(2, "0")}
        onChange={(e) => emit(h, m, Number(e.target.value))}
        disabled={disabled}
        className={inputCls}
        aria-label="Seconds"
      />
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
