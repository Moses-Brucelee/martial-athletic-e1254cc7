import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface DateOfBirthPickerProps {
  value: string | undefined; // ISO "YYYY-MM-DD" or undefined
  onChange: (isoDate: string | undefined) => void;
  disabled?: boolean;
  error?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function DateOfBirthPicker({ value, onChange, disabled, error }: DateOfBirthPickerProps) {
  const today = new Date();
  const currentYear = today.getFullYear();

  const parsed = useMemo(() => {
    if (!value) return { year: "", month: "", day: "" };
    const [y, m, d] = value.split("-");
    return { year: y || "", month: m ? String(parseInt(m, 10)) : "", day: d ? String(parseInt(d, 10)) : "" };
  }, [value]);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear; y >= currentYear - 100; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  const maxDays = useMemo(() => {
    if (!parsed.year || !parsed.month) return 31;
    return daysInMonth(parseInt(parsed.month, 10), parseInt(parsed.year, 10));
  }, [parsed.year, parsed.month]);

  const days = useMemo(() => {
    const arr: number[] = [];
    for (let d = 1; d <= maxDays; d++) arr.push(d);
    return arr;
  }, [maxDays]);

  const emitChange = (year: string, month: string, day: string) => {
    if (!year || !month || !day) {
      onChange(undefined);
      return;
    }
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    let d = parseInt(day, 10);
    const maxD = daysInMonth(m, y);
    if (d > maxD) d = maxD;

    const candidate = new Date(y, m - 1, d);
    if (candidate > today) {
      onChange(undefined);
      return;
    }

    const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    onChange(iso);
  };

  return (
    <div className="space-y-2">
      <Label className="text-foreground font-medium">Date of Birth</Label>
      <div className="grid grid-cols-3 gap-2">
        <Select
          value={parsed.year}
          onValueChange={(v) => emitChange(v, parsed.month, parsed.day)}
          disabled={disabled}
        >
          <SelectTrigger className="h-11 bg-background">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={parsed.month}
          onValueChange={(v) => emitChange(parsed.year, v, parsed.day)}
          disabled={disabled}
        >
          <SelectTrigger className="h-11 bg-background">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((name, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={parsed.day}
          onValueChange={(v) => emitChange(parsed.year, parsed.month, v)}
          disabled={disabled}
        >
          <SelectTrigger className="h-11 bg-background">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {days.map((d) => (
              <SelectItem key={d} value={String(d)}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
