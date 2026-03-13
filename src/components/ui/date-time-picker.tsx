import * as React from "react";
import { format, isValid } from "date-fns";
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
  className?: string;
}

export type { DateTimePickerProps };

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  dateOnly = false,
  minDate,
  maxDate,
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

  // Desktop: custom popover picker
  const handleDateSelect = (day: Date | undefined) => {
    if (!day) { onChange(undefined); return; }
    if (value) day.setHours(value.getHours(), value.getMinutes());
    onChange(day);
    if (dateOnly) setOpen(false);
  };

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
          onSelect={handleDateSelect}
          disabled={(date) => {
            if (minDate && date < minDate) return true;
            if (maxDate && date > maxDate) return true;
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
              onChange={(h, m) => {
                const next = value ? new Date(value) : new Date();
                next.setHours(h, m, 0, 0);
                onChange(next);
              }}
              disabled={disabled}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
