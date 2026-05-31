import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { TimeWheelPicker } from "@/modules/scoring/components/TimeWheelPicker";
import { cn } from "@/lib/utils";

interface TimeCaptureFieldProps {
  /** Total seconds as a string. */
  value: string;
  onChange: (totalSeconds: string) => void;
  disabled?: boolean;
  className?: string;
  /** Visual size of the collapsed display button. */
  size?: "sm" | "md" | "lg";
}

const pad = (n: number) => String(n).padStart(2, "0");

function parse(value: string) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  return { m: Math.floor(n / 60), s: n % 60 };
}

function format(value: string) {
  const { m, s } = parse(value);
  return `${pad(m)}:${pad(s)}`;
}

/**
 * Compact time field: shows the captured MM:SS as a tappable chip, expands
 * into a minutes/seconds editor on demand and collapses back on confirm.
 *
 * - Mobile: native numeric inputs (system keypad)
 * - Desktop: scroll-wheel picker (minutes + seconds only)
 */
export function TimeCaptureField({
  value,
  onChange,
  disabled,
  className,
  size = "md",
}: TimeCaptureFieldProps) {
  const isMobile = useIsMobile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const minRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing && isMobile) {
      // Focus minutes input on open for fast entry
      requestAnimationFrame(() => minRef.current?.focus());
    }
  }, [editing, isMobile]);

  const confirm = () => {
    onChange(draft);
    setEditing(false);
  };

  const sizeMap = {
    sm: "h-8 px-2 text-xs",
    md: "h-10 px-3 text-sm",
    lg: "h-12 px-4 text-base",
  } as const;

  if (!editing) {
    const display = format(value);
    const empty = !value || Number(value) === 0;
    return (
      <button
        type="button"
        onClick={() => !disabled && setEditing(true)}
        disabled={disabled}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-input bg-background font-bold tabular-nums transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed",
          sizeMap[size],
          empty && "text-muted-foreground",
          className,
        )}
        aria-label="Edit time"
      >
        <span>{empty ? "--:--" : display}</span>
        <Pencil className="h-3 w-3 opacity-60" />
      </button>
    );
  }

  const { m, s } = parse(draft);
  const setParts = (nm: number, ns: number) => {
    const total = Math.max(0, nm) * 60 + Math.max(0, ns);
    setDraft(String(total));
  };

  return (
    <div className={cn("inline-flex flex-col items-center gap-2 rounded-md border border-primary/40 bg-card p-2 shadow-sm", className)}>
      {isMobile ? (
        <div className="flex items-end gap-1.5">
          <div className="flex flex-col items-center">
            <Input
              ref={minRef}
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              max={59}
              value={m}
              onChange={(e) => setParts(Math.min(59, Math.max(0, Number(e.target.value) || 0)), s)}
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 w-16 text-center text-2xl font-black tabular-nums bg-background"
            />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mt-0.5">min</span>
          </div>
          <span className="text-2xl font-black text-muted-foreground pb-5">:</span>
          <div className="flex flex-col items-center">
            <Input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min={0}
              max={59}
              value={s}
              onChange={(e) => setParts(m, Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
              onFocus={(e) => e.currentTarget.select()}
              className="h-12 w-16 text-center text-2xl font-black tabular-nums bg-background"
            />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mt-0.5">sec</span>
          </div>
        </div>
      ) : (
        <TimeWheelPicker value={draft} onChange={setDraft} showHours={false} />
      )}
      <div className="flex gap-2 w-full">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={() => {
            setDraft(value);
            setEditing(false);
          }}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1 h-8 text-xs font-bold"
          onClick={confirm}
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          Done
        </Button>
      </div>
    </div>
  );
}
