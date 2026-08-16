import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Calendar, MapPin, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useUpcomingCompetitions,
  POSTER_GRADIENTS,
  POSTER_QUOTES,
} from "./useUpcomingCompetitions";

export function FeaturedCompetitionHero() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useUpcomingCompetitions(5);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const items = data ?? [];

  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setInterval(() => setActive((i) => (i + 1) % items.length), 7000);
    return () => clearInterval(t);
  }, [paused, items.length]);

  if (isLoading) {
    return <Skeleton className="w-full aspect-[4/3] sm:aspect-[16/7] rounded-2xl" />;
  }

  if (isError || items.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
        <Trophy className="h-8 w-8 text-muted-foreground/40 mx-auto" />
        <p className="text-sm text-muted-foreground">
          Nothing on the calendar yet. Set up the first event and it lands here.
        </p>
        <Button size="sm" onClick={() => navigate("/competitions")}>
          Go to competitions
        </Button>
      </div>
    );
  }

  const c = items[Math.min(active, items.length - 1)];
  const gradient = POSTER_GRADIENTS[active % POSTER_GRADIENTS.length];
  const quote = POSTER_QUOTES[active % POSTER_QUOTES.length];
  const dateStr = c.date ? format(new Date(c.date), "dd MMM yyyy") : null;

  return (
    <div
      className="space-y-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/competition/${c.id}`)}
        onKeyDown={(e) => e.key === "Enter" && navigate(`/competition/${c.id}`)}
        className="relative w-full aspect-[4/3] sm:aspect-[16/7] rounded-2xl overflow-hidden border border-border bg-card cursor-pointer group"
      >
        {c.poster_url ? (
          <img
            src={c.poster_url}
            alt={c.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)}>
            <Trophy className="h-64 w-64 text-background/10 absolute -bottom-10 -right-10" />
            <p className="absolute inset-0 flex items-center justify-center text-2xl sm:text-4xl font-black text-background/90 uppercase whitespace-pre-line text-center leading-tight tracking-wider">
              {quote}
            </p>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 space-y-2">
          {c.type && (
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              {c.type}
            </span>
          )}
          <h2 className="text-xl sm:text-3xl font-black uppercase text-foreground leading-tight line-clamp-2">
            {c.name}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
            {dateStr && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {dateStr}
              </span>
            )}
            {(c.host_gym || c.venue) && (
              <span className="flex items-center gap-1.5 min-w-0">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.host_gym ?? c.venue}</span>
              </span>
            )}
          </div>
          <Button
            size="sm"
            className="mt-1 font-bold uppercase tracking-wide"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/competition/${c.id}`);
            }}
          >
            View event
          </Button>
        </div>
      </div>

      {items.length > 1 && (
        <>
          {/* Desktop / tablet thumbnails */}
          <div className="hidden sm:flex gap-2">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={it.name}
                className={cn(
                  "flex-1 min-w-0 rounded-lg border px-3 py-2 text-left transition-colors",
                  i === active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <span className="block text-[11px] font-bold uppercase truncate text-foreground">
                  {it.name}
                </span>
                <span className="block text-[10px] text-muted-foreground truncate">
                  {it.date ? format(new Date(it.date), "dd MMM") : "Date TBC"}
                </span>
              </button>
            ))}
          </div>

          {/* Mobile dots */}
          <div className="flex sm:hidden items-center justify-center gap-2">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                aria-label={`Show ${it.name}`}
                onClick={() => setActive(i)}
                className="h-11 w-6 flex items-center justify-center"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all",
                    i === active ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40"
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
