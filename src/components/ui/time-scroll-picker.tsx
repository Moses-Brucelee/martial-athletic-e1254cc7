import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";

interface TimeScrollPickerProps {
  hours: number;
  minutes: number;
  onChange: (hours: number, minutes: number) => void;
  disabled?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

function Stepper({
  value,
  max,
  onChange,
  disabled,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const increment = () => onChange((value + 1) % (max + 1));
  const decrement = () => onChange((value - 1 + max + 1) % (max + 1));

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={increment}
        disabled={disabled}
        className="min-h-[36px] min-w-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/20 active:bg-accent/30 transition-colors disabled:opacity-50"
        aria-label="Increment"
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <div className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-accent/15 border border-accent/25">
        <span className="text-xl font-bold text-foreground tabular-nums select-none">
          {pad(value)}
        </span>
      </div>
      <button
        type="button"
        onClick={decrement}
        disabled={disabled}
        className="min-h-[36px] min-w-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/20 active:bg-accent/30 transition-colors disabled:opacity-50"
        aria-label="Decrement"
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  );
}

export function TimeScrollPicker({
  hours,
  minutes,
  onChange,
  disabled = false,
}: TimeScrollPickerProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-3 px-4">
      <Stepper
        value={hours}
        max={23}
        onChange={(h) => onChange(h, minutes)}
        disabled={disabled}
      />
      <span className="text-2xl font-bold text-foreground select-none mt-0.5">:</span>
      <Stepper
        value={minutes}
        max={59}
        onChange={(m) => onChange(hours, m)}
        disabled={disabled}
      />
    </div>
  );
}
