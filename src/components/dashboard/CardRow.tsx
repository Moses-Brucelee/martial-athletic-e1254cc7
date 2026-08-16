import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardRowProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function CardRow({ title, action, children, className }: CardRowProps) {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 240), behavior: "smooth" });
  };

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {action}
          <div className="hidden lg:flex items-center gap-1">
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollBy(-1)}
              className="h-8 w-8 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollBy(1)}
              className="h-8 w-8 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors flex items-center justify-center"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scroller}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-1"
      >
        {children}
      </div>
    </section>
  );
}
