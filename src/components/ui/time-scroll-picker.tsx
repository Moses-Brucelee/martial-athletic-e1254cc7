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
  /** Earliest selectable time of day, in minutes from midnight. */
  minMinutes?: number;
  /** Latest selectable time of day, in minutes from midnight. */
  maxMinutes?: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function TimeScrollPicker({
  hours,
  minutes,
  onChange,
  disabled = false,
  minMinutes,
  maxMinutes,
}: TimeScrollPickerProps) {
  const lo = minMinutes ?? 0;
  const hi = maxMinutes ?? 24 * 60 - 1;

  const hourAllowed = (h: number) => h * 60 + 59 >= lo && h * 60 <= hi;
  const minuteAllowed = (m: number) => {
    const total = hours * 60 + m;
    return total >= lo && total <= hi;
  };

  const availableHours = HOURS.filter(hourAllowed);
  const availableMinutes = MINUTES.filter(minuteAllowed);

  const handleHour = (h: number) => {
    // Snap the minute into the allowed window for the newly chosen hour
    let m = minutes;
    const total = h * 60 + m;
    if (total < lo) m = Math.min(59, lo - h * 60);
    if (total > hi) m = Math.max(0, hi - h * 60);
    onChange(h, m);
  };

  return (
    <div className="flex items-center justify-center gap-2 py-3 px-4">
      <Select
        value={String(hours)}
        onValueChange={(v) => handleHour(Number(v))}
        disabled={disabled}
      >
        <SelectTrigger className="w-20 h-11 bg-background text-center font-bold tabular-nums">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-52 z-50 bg-popover">
          {availableHours.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {pad(h)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-xl font-bold text-foreground select-none">:</span>

      <Select
        value={String(minutes)}
        onValueChange={(v) => onChange(hours, Number(v))}
        disabled={disabled}
      >
        <SelectTrigger className="w-20 h-11 bg-background text-center font-bold tabular-nums">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-52 z-50 bg-popover">
          {availableMinutes.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {pad(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
