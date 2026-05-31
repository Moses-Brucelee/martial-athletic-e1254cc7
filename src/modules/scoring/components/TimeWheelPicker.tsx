import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface TimeWheelPickerProps {
  /** Total seconds as a string (matches the rest of the scoring pipeline). */
  value: string;
  onChange: (totalSeconds: string) => void;
  disabled?: boolean;
  className?: string;
  /** Show hours column. Defaults to true. */
  showHours?: boolean;
}

const ITEM_HEIGHT = 36; // px per row
const VISIBLE = 5; // odd number, center row is the selected one
const PAD = Math.floor(VISIBLE / 2);

function parseTotal(total: string) {
  const n = Math.max(0, Math.floor(Number(total) || 0));
  return {
    h: Math.floor(n / 3600),
    m: Math.floor((n % 3600) / 60),
    s: n % 60,
  };
}

interface WheelColumnProps {
  label: string;
  max: number; // inclusive
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}

function WheelColumn({ label, max, value, onChange, disabled }: WheelColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const items = Array.from({ length: max + 1 }, (_, i) => i);
  const settleTimer = useRef<number | null>(null);
  const isSyncing = useRef(false);

  // Sync scroll position when value changes from outside.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = value * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - target) > 1) {
      isSyncing.current = true;
      el.scrollTo({ top: target, behavior: "auto" });
      // Release sync flag after the scroll event fires.
      window.setTimeout(() => {
        isSyncing.current = false;
      }, 50);
    }
  }, [value]);

  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el || disabled) return;
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      if (isSyncing.current) return;
      const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clamped = Math.min(Math.max(idx, 0), max);
      const snapTop = clamped * ITEM_HEIGHT;
      if (Math.abs(el.scrollTop - snapTop) > 0.5) {
        el.scrollTo({ top: snapTop, behavior: "smooth" });
      }
      if (clamped !== value) onChange(clamped);
    }, 90);
  }, [disabled, max, onChange, value]);

  const bump = (delta: number) => {
    if (disabled) return;
    const next = Math.min(Math.max(value + delta, 0), max);
    onChange(next);
  };

  return (
    <div className="flex flex-col items-center select-none">
      <button
        type="button"
        onClick={() => bump(1)}
        disabled={disabled || value >= max}
        className="h-6 w-12 text-muted-foreground hover:text-foreground disabled:opacity-30 text-lg leading-none"
        aria-label={`Increase ${label}`}
        tabIndex={-1}
      >
        ▲
      </button>
      <div
        className="relative w-14 overflow-hidden rounded-md bg-background border border-border"
        style={{ height: VISIBLE * ITEM_HEIGHT }}
      >
        {/* Center selection highlight */}
        <div
          className="pointer-events-none absolute left-0 right-0 border-y border-primary/40 bg-primary/5"
          style={{ top: PAD * ITEM_HEIGHT, height: ITEM_HEIGHT }}
        />
        {/* Fade masks */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-9 bg-gradient-to-b from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-background to-transparent z-10" />

        <div
          ref={ref}
          onScroll={handleScroll}
          className={cn(
            "h-full overflow-y-scroll scrollbar-hide",
            disabled && "pointer-events-none opacity-60",
          )}
          style={{
            scrollSnapType: "y mandatory",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
          role="listbox"
          aria-label={label}
        >
          <div style={{ height: PAD * ITEM_HEIGHT }} />
          {items.map((n) => (
            <div
              key={n}
              role="option"
              aria-selected={n === value}
              onClick={() => onChange(n)}
              className={cn(
                "flex items-center justify-center tabular-nums font-bold cursor-pointer transition-colors",
                n === value ? "text-foreground text-xl" : "text-muted-foreground text-base",
              )}
              style={{ height: ITEM_HEIGHT, scrollSnapAlign: "center" }}
            >
              {String(n).padStart(2, "0")}
            </div>
          ))}
          <div style={{ height: PAD * ITEM_HEIGHT }} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => bump(-1)}
        disabled={disabled || value <= 0}
        className="h-6 w-12 text-muted-foreground hover:text-foreground disabled:opacity-30 text-lg leading-none"
        aria-label={`Decrease ${label}`}
        tabIndex={-1}
      >
        ▼
      </button>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
        {label}
      </span>
    </div>
  );
}

/**
 * iOS-style scroll wheel time picker. Three columns (HH / MM / SS).
 * Emits the total seconds as a string to stay compatible with the rest of the scoring pipeline.
 */
export function TimeWheelPicker({
  value,
  onChange,
  disabled,
  className,
  showHours = true,
}: TimeWheelPickerProps) {
  const { h, m, s } = parseTotal(value);

  const emit = (nh: number, nm: number, ns: number) => {
    const total = Math.max(0, nh) * 3600 + Math.max(0, nm) * 60 + Math.max(0, ns);
    onChange(String(total));
  };

  return (
    <div
      className={cn("inline-flex items-end gap-1.5", className)}
      aria-label="Scroll to select time in hours, minutes, seconds"
    >
      {showHours && (
        <>
          <WheelColumn label="hrs" max={23} value={h} onChange={(n) => emit(n, m, s)} disabled={disabled} />
          <span className="text-2xl font-black text-muted-foreground pb-7">:</span>
        </>
      )}
      <WheelColumn label="min" max={59} value={m} onChange={(n) => emit(h, n, s)} disabled={disabled} />
      <span className="text-2xl font-black text-muted-foreground pb-7">:</span>
      <WheelColumn label="sec" max={59} value={s} onChange={(n) => emit(h, m, n)} disabled={disabled} />
    </div>
  );
}
