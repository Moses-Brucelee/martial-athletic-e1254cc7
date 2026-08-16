import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  index?: string;
  title: string;
  note?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Off-grid section heading: a small ordinal, a heavy Oswald title,
 * a rule that runs out to the right, then the action.
 */
export function SectionHeading({ index, title, note, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex items-end gap-3 sm:gap-4", className)}>
      {index && (
        <span className="hidden sm:block text-[11px] font-bold tabular-nums text-primary/70 pb-1.5 tracking-widest">
          {index}
        </span>
      )}
      <div className="min-w-0">
        <h2 className="text-lg sm:text-2xl font-bold uppercase tracking-tight text-foreground leading-none">
          {title}
        </h2>
        {note && (
          <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{note}</p>
        )}
      </div>
      <span className="flex-1 h-px bg-border mb-2 hidden sm:block" />
      {action && <div className="shrink-0 mb-0.5">{action}</div>}
    </div>
  );
}
