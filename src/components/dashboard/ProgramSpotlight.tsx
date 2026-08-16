import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listPrograms } from "@/modules/programs/api";
import { CardRow } from "./CardRow";
import { SectionHeading } from "./SectionHeading";

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
      <section className="space-y-4">
        <SectionHeading index="02" title="Training programs" />
        <div className="border-l-2 border-primary bg-card/60 p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
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
      index="02"
      title="Training programs"
      note="Structured blocks you can follow session by session"
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
            <Skeleton key={i} className="h-44 w-[220px] shrink-0 rounded-none" />
          ))
        : programs.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(`/programs/${p.id}`)}
              className="snap-start shrink-0 w-[220px] text-left overflow-hidden border border-border bg-card hover:border-primary transition-all group"
            >
              <div className="relative h-28 w-full bg-secondary overflow-hidden">
                {p.cover_url ? (
                  <img
                    src={p.cover_url}
                    alt={p.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Dumbbell className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
                <span className="absolute top-0 left-0 bg-background/85 backdrop-blur-sm text-[10px] font-bold tabular-nums text-primary px-2 py-1 tracking-widest">
                  {String(idx + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="p-3 space-y-2">
                <h3 className="text-sm font-bold uppercase text-foreground leading-tight line-clamp-2">
                  {p.title}
                </h3>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {p.weeks_count} weeks · {p.days_per_week} days a week
                </p>
              </div>
            </button>
          ))}
    </CardRow>
  );
}
