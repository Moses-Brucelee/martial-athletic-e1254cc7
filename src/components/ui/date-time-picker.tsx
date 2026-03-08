import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
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
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  dateOnly = false,
  minDate,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const timeStr = value ? format(value, "HH:mm") : "";

  const handleDateSelect = (day: Date | undefined) => {
    if (!day) {
      onChange(undefined);
      return;
    }
    // Preserve existing time when changing date
    if (value) {
      day.setHours(value.getHours(), value.getMinutes());
    }
    onChange(day);
    if (dateOnly) setOpen(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value; // "HH:mm"
    if (!t) return;
    const [h, m] = t.split(":").map(Number);
    const next = value ? new Date(value) : new Date();
    next.setHours(h, m, 0, 0);
    onChange(next);
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
          disabled={minDate ? (date) => date < minDate : undefined}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
        {!dateOnly && (
          <div className="border-t border-border px-3 py-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="time"
              value={timeStr}
              onChange={handleTimeChange}
              className="h-9 w-full bg-background"
              disabled={disabled}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
