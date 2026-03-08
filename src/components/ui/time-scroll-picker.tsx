import * as React from "react";
import { cn } from "@/lib/utils";

interface TimeScrollPickerProps {
  hours: number;
  minutes: number;
  onChange: (hours: number, minutes: number) => void;
  disabled?: boolean;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);

function useScrollWheel(
  items: number[],
  selectedValue: number,
  onSelect: (value: number) => void
) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isScrolling = React.useRef(false);
  const scrollTimeout = React.useRef<ReturnType<typeof setTimeout>>();

  const selectedIndex = items.indexOf(selectedValue);

  // Scroll to selected on mount and when value changes externally
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || isScrolling.current) return;
    el.scrollTop = selectedIndex * ITEM_HEIGHT;
  }, [selectedIndex]);

  const handleScroll = () => {
    isScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;

      const index = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));

      // Snap to position
      el.scrollTo({ top: clampedIndex * ITEM_HEIGHT, behavior: "smooth" });

      if (items[clampedIndex] !== selectedValue) {
        onSelect(items[clampedIndex]);
      }

      setTimeout(() => {
        isScrolling.current = false;
      }, 100);
    }, 80);
  };

  return { containerRef, handleScroll };
}

function ScrollColumn({
  items,
  selectedValue,
  onSelect,
  formatValue,
  disabled,
}: {
  items: number[];
  selectedValue: number;
  onSelect: (v: number) => void;
  formatValue: (v: number) => string;
  disabled?: boolean;
}) {
  const { containerRef, handleScroll } = useScrollWheel(items, selectedValue, onSelect);

  return (
    <div className="relative" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
      {/* Selection highlight */}
      <div
        className="absolute left-0 right-0 z-0 rounded-md bg-accent/20 border border-accent/30 pointer-events-none"
        style={{
          top: CENTER_INDEX * ITEM_HEIGHT,
          height: ITEM_HEIGHT,
        }}
      />

      {/* Fade masks */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-popover to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-popover to-transparent z-10 pointer-events-none" />

      {/* Scroll container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={cn(
          "h-full overflow-y-auto scrollbar-hide relative z-[1]",
          disabled && "opacity-50 pointer-events-none"
        )}
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Top padding */}
        <div style={{ height: CENTER_INDEX * ITEM_HEIGHT }} />

        {items.map((item) => (
          <div
            key={item}
            className={cn(
              "flex items-center justify-center cursor-pointer transition-all duration-150 select-none",
              item === selectedValue
                ? "text-foreground font-bold text-lg"
                : "text-muted-foreground text-base"
            )}
            style={{
              height: ITEM_HEIGHT,
              scrollSnapAlign: "start",
            }}
            onClick={() => {
              if (!disabled) onSelect(item);
            }}
          >
            {formatValue(item)}
          </div>
        ))}

        {/* Bottom padding */}
        <div style={{ height: CENTER_INDEX * ITEM_HEIGHT }} />
      </div>
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const pad = (n: number) => String(n).padStart(2, "0");

export function TimeScrollPicker({
  hours,
  minutes,
  onChange,
  disabled = false,
}: TimeScrollPickerProps) {
  return (
    <div className="flex items-center justify-center gap-1 py-2 px-3">
      <div className="w-16">
        <ScrollColumn
          items={HOURS}
          selectedValue={hours}
          onSelect={(h) => onChange(h, minutes)}
          formatValue={pad}
          disabled={disabled}
        />
      </div>

      <span className="text-xl font-bold text-foreground select-none pb-0.5">:</span>

      <div className="w-16">
        <ScrollColumn
          items={MINUTES}
          selectedValue={minutes}
          onSelect={(m) => onChange(hours, m)}
          formatValue={pad}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
