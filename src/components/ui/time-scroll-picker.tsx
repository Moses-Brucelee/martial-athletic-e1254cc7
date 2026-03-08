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

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function TimeScrollPicker({
  hours,
  minutes,
  onChange,
  disabled = false,
}: TimeScrollPickerProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-3 px-4">
      <Select
        value={String(hours)}
        onValueChange={(v) => onChange(Number(v), minutes)}
        disabled={disabled}
      >
        <SelectTrigger className="w-20 h-11 bg-background text-center font-bold tabular-nums">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-52 z-50 bg-popover">
          {HOURS.map((h) => (
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
          {MINUTES.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {pad(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
