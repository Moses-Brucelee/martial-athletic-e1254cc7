import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeScrollPickerProps {
  hours: number;
  minutes: number;
  onChange: (hours: number, minutes: number) => void;
  disabled?: boolean;
}

const PRESETS = [
  { label: "06:00", h: 6, m: 0 },
  { label: "07:00", h: 7, m: 0 },
  { label: "08:00", h: 8, m: 0 },
  { label: "09:00", h: 9, m: 0 },
  { label: "10:00", h: 10, m: 0 },
  { label: "11:00", h: 11, m: 0 },
  { label: "12:00", h: 12, m: 0 },
  { label: "13:00", h: 13, m: 0 },
  { label: "14:00", h: 14, m: 0 },
  { label: "15:00", h: 15, m: 0 },
  { label: "16:00", h: 16, m: 0 },
  { label: "17:00", h: 17, m: 0 },
  { label: "18:00", h: 18, m: 0 },
  { label: "19:00", h: 19, m: 0 },
  { label: "20:00", h: 20, m: 0 },
  { label: "21:00", h: 21, m: 0 },
];

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function TimeScrollPicker({
  hours,
  minutes,
  onChange,
  disabled = false,
}: TimeScrollPickerProps) {
  const [showCustom, setShowCustom] = React.useState(false);
  const isPreset = minutes === 0 && PRESETS.some((p) => p.h === hours);

  return (
    <div className="py-2 px-3 space-y-2">
      {/* Preset grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {PRESETS.map((p) => {
          const active = hours === p.h && minutes === p.m;
          return (
            <button
              key={p.label}
              type="button"
              disabled={disabled}
              onClick={() => { onChange(p.h, p.m); setShowCustom(false); }}
              className={cn(
                "min-h-[36px] rounded-md text-xs font-semibold tabular-nums transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-foreground hover:bg-accent/20 active:bg-accent/30",
                disabled && "opacity-50 pointer-events-none"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Custom toggle */}
      <button
        type="button"
        onClick={() => setShowCustom(!showCustom)}
        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1 font-medium"
      >
        {showCustom ? "Hide custom time" : (!isPreset ? `Custom: ${pad(hours)}:${pad(minutes)}` : "Set custom time")}
      </button>

      {/* Custom dropdowns */}
      {showCustom && (
        <div className="flex items-center justify-center gap-2 pb-1">
          <Select
            value={String(hours)}
            onValueChange={(v) => onChange(Number(v), minutes)}
            disabled={disabled}
          >
            <SelectTrigger className="w-20 h-10 bg-background text-center font-bold tabular-nums text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-52 z-50 bg-popover">
              {HOURS.map((h) => (
                <SelectItem key={h} value={String(h)}>{pad(h)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-lg font-bold text-foreground select-none">:</span>

          <Select
            value={String(minutes)}
            onValueChange={(v) => onChange(hours, Number(v))}
            disabled={disabled}
          >
            <SelectTrigger className="w-20 h-10 bg-background text-center font-bold tabular-nums text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-52 z-50 bg-popover">
              {MINUTES.map((m) => (
                <SelectItem key={m} value={String(m)}>{pad(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
