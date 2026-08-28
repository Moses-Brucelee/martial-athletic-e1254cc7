import * as React from "react";
import { format, isValid, isSameDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { TimeScrollPicker } from "@/components/ui/time-scroll-picker";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Show only date (no time) */
  dateOnly?: boolean;
  /** Min selectable date */
  minDate?: Date;
  /** Max selectable date */
  maxDate?: Date;
  /**
   * Date the calendar opens on when nothing is selected yet.
   * Falls back to minDate, then today.
   */
  defaultMonth?: Date;
  className?: string;
}

export type { DateTimePickerProps };

const startOfDay = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  dateOnly = false,
  minDate,
  maxDate,
  defaultMonth,
  className,
}: DateTimePickerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  // Native mobile input handler
  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) { onChange(undefined); return; }
    if (dateOnly) {
      const [y, m, d] = val.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      if (value) date.setHours(value.getHours(), value.getMinutes());
      onChange(date);
    } else {
      onChange(new Date(val));
    }
  };

  // On mobile, render native inputs
  if (isMobile) {
    const inputType = dateOnly ? "date" : "datetime-local";
    const nativeValue = value && isValid(value)
      ? dateOnly
        ? format(value, "yyyy-MM-dd")
        : format(value, "yyyy-MM-dd'T'HH:mm")
      : "";
    const minValue = minDate
      ? dateOnly
        ? format(minDate, "yyyy-MM-dd")
        : format(minDate, "yyyy-MM-dd'T'HH:mm")
      : undefined;
    const maxValue = maxDate
      ? dateOnly
        ? format(maxDate, "yyyy-MM-dd")
        : format(maxDate, "yyyy-MM-dd'T'HH:mm")
      : undefined;

    return (
      <div className={cn("relative", className)}>
        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <input
          type={inputType}
          value={nativeValue}
          onChange={handleNativeChange}
          disabled={disabled}
          min={minValue}
          max={maxValue}
          className={cn(
            "flex h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !nativeValue && "text-muted-foreground"
          )}
        />
      </div>
    );
  }

  // Time-of-day bounds only apply on the boundary days
  const minMinutes =
    !dateOnly && minDate && value && isSameDay(value, minDate)
      ? minDate.getHours() * 60 + minDate.getMinutes()
      : undefined;
  const maxMinutes =
    !dateOnly && maxDate && value && isSameDay(value, maxDate)
      ? maxDate.getHours() * 60 + maxDate.getMinutes()
      : undefined;

  const clampToBounds = (d: Date): Date => {
    const next = new Date(d);
    if (!dateOnly && minDate && isSameDay(next, minDate) && next.getTime() < minDate.getTime()) {
      next.setHours(minDate.getHours(), minDate.getMinutes(), 0, 0);
    }
    if (!dateOnly && maxDate && isSameDay(next, maxDate) && next.getTime() > maxDate.getTime()) {
      next.setHours(maxDate.getHours(), maxDate.getMinutes(), 0, 0);
    }
    return next;
  };

  // Desktop: custom popover picker
  const handleDateSelect = (day: Date | undefined) => {
    if (!day) { onChange(undefined); return; }
    const next = new Date(day);
    if (value) next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    else if (minDate) next.setHours(minDate.getHours(), minDate.getMinutes(), 0, 0);
    onChange(clampToBounds(next));
    if (dateOnly) setOpen(false);
  };

  const openMonth = value ?? defaultMonth ?? minDate ?? undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full h-11 justify-start text-left font-normal bg-background",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {value && isValid(value) ? (
            <span className="truncate">
              {dateOnly
                ? format(value, "dd MMM yyyy")
                : format(value, "dd MMM yyyy · HH:mm")}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={openMonth}
          onSelect={handleDateSelect}
          disabled={(date) => {
            if (minDate && startOfDay(date) < startOfDay(minDate)) return true;
            if (maxDate && startOfDay(date) > startOfDay(maxDate)) return true;
            return false;
          }}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
        {!dateOnly && (
          <div className="border-t border-border">
            <TimeScrollPicker
              hours={value ? value.getHours() : 0}
              minutes={value ? value.getMinutes() : 0}
              minMinutes={minMinutes}
              maxMinutes={maxMinutes}
              onChange={(h, m) => {
                const next = value ? new Date(value) : new Date();
                next.setHours(h, m, 0, 0);
                onChange(clampToBounds(next));
              }}
              disabled={disabled}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
