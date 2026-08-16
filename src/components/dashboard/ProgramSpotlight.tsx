import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listPrograms } from "@/modules/programs/api";
import { CardRow } from "./CardRow";

export function ProgramSpotlight() {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-programs-row"],
    queryFn: () => listPrograms({ limit: 10 }),
  });

  if (isError) return null;

  const programs = data ?? [];

  if (!isLoading && programs.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">
          Training programs
        </h2>
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <p className="text-sm text-muted-foreground">
            No published programs yet. Build one and run it week by week.
          </p>
          <Button size="sm" variant="outline" onClick={() => navigate("/programs")}>
            Open programs
          </Button>
        </div>
      </section>
    );
  }

  return (
    <CardRow
      title="Training programs"
      action={
        <Button
          size="sm"
          variant="ghost"
          className="text-[11px] uppercase font-semibold"
          onClick={() => navigate("/programs")}
        >
          See all
        </Button>
      }
    >
      {isLoading
        ? [1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 w-[220px] shrink-0 rounded-xl" />
          ))
        : programs.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/programs/${p.id}`)}
              className="snap-start shrink-0 w-[220px] text-left rounded-xl overflow-hidden border border-border bg-card hover:border-primary/50 hover:-translate-y-0.5 transition-all"
            >
              <div className="relative h-24 w-full bg-secondary overflow-hidden">
                {p.cover_url ? (
                  <img
                    src={p.cover_url}
                    alt={p.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Dumbbell className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="p-3 space-y-1.5">
                <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-2">
                  {p.title}
                </h3>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" /> {p.weeks_count} weeks
                  </span>
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-3 w-3" /> {p.days_per_week}/week
                  </span>
                </div>
              </div>
            </button>
          ))}
    </CardRow>
  );
}
