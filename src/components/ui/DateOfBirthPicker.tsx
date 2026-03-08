import { useMemo, useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

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
  const isMobile = useIsMobile();

  // Parse initial value into local state
  const initial = useMemo(() => {
    if (!value) return { year: "", month: "", day: "" };
    const [y, m, d] = value.split("-");
    return {
      year: y || "",
      month: m ? String(parseInt(m, 10)) : "",
      day: d ? String(parseInt(d, 10)) : "",
    };
  }, [value]);

  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);

  // Sync from parent when value changes externally
  useEffect(() => {
    setYear(initial.year);
    setMonth(initial.month);
    setDay(initial.day);
  }, [initial.year, initial.month, initial.day]);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear; y >= currentYear - 100; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  const maxDays = useMemo(() => {
    if (!year || !month) return 31;
    return daysInMonth(parseInt(month, 10), parseInt(year, 10));
  }, [year, month]);

  const days = useMemo(() => {
    const arr: number[] = [];
    for (let d = 1; d <= maxDays; d++) arr.push(d);
    return arr;
  }, [maxDays]);

  const tryEmit = (y: string, m: string, d: string) => {
    if (!y || !m || !d) return;
    const yi = parseInt(y, 10);
    const mi = parseInt(m, 10);
    let di = parseInt(d, 10);
    const maxD = daysInMonth(mi, yi);
    if (di > maxD) di = maxD;

    const candidate = new Date(yi, mi - 1, di);
    if (candidate > today) return;

    const iso = `${String(yi).padStart(4, "0")}-${String(mi).padStart(2, "0")}-${String(di).padStart(2, "0")}`;
    onChange(iso);
  };

  const handleYear = (v: string) => { setYear(v); tryEmit(v, month, day); };
  const handleMonth = (v: string) => { setMonth(v); tryEmit(year, v, day); };
  const handleDay = (v: string) => { setDay(v); tryEmit(year, month, v); };

  // Mobile: native date input triggers iOS/Android wheel picker
  if (isMobile) {
    const todayISO = `${currentYear}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return (
      <div className="space-y-2">
        <Label className="text-foreground font-medium">Date of Birth</Label>
        <div className="relative">
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <input
            type="date"
            value={value || ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            disabled={disabled}
            max={todayISO}
            className={cn(
              "flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              !value && "text-muted-foreground"
            )}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // Desktop: triple-select dropdowns
  return (
    <div className="space-y-2">
      <Label className="text-foreground font-medium">Date of Birth</Label>
      <div className="grid grid-cols-3 gap-2">
        <Select value={year} onValueChange={handleYear} disabled={disabled}>
          <SelectTrigger className="h-11 bg-background">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="max-h-60 z-50 bg-popover">
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={month} onValueChange={handleMonth} disabled={disabled}>
          <SelectTrigger className="h-11 bg-background">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent className="z-50 bg-popover">
            {MONTHS.map((name, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={day} onValueChange={handleDay} disabled={disabled}>
          <SelectTrigger className="h-11 bg-background">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent className="max-h-60 z-50 bg-popover">
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