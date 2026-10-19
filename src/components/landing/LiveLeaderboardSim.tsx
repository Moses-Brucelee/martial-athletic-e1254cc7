import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

type Row = { name: string; gym: string; points: number };

const START: Row[] = [
  { name: "Iron Lotus", gym: "Durban Combat", points: 285 },
  { name: "Red Tide", gym: "Cape Strength", points: 280 },
  { name: "Northside Grit", gym: "Jozi Fight Lab", points: 270 },
  { name: "Steel Monkeys", gym: "Pretoria BJJ", points: 262 },
  { name: "Forge Five", gym: "Stellenbosch MMA", points: 255 },
];

export function LiveLeaderboardSim() {
  const [rows, setRows] = useState(START);
  const [running, setRunning] = useState(true);
  const [venue, setVenue] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setRows((prev) => {
        const i = Math.floor(Math.random() * prev.length);
        const gain = 5 + Math.floor(Math.random() * 15);
        setFlash(prev[i].name);
        return prev
          .map((r, idx) => (idx === i ? { ...r, points: r.points + gain } : r))
          .sort((a, b) => b.points - a.points);
      });
    }, 2200);
    return () => clearInterval(t);
  }, [running]);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-all duration-500",
        venue ? "border-primary shadow-2xl shadow-primary/30 scale-[1.01]" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            {running && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />}
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground">
            Sample event · Workout 3 of 4
          </span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-10" onClick={() => setRunning((r) => !r)}>
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span className="ml-1.5">{running ? "Pause" : "Resume"}</span>
          </Button>
          <Button size="sm" variant={venue ? "default" : "outline"} className="h-10" onClick={() => setVenue((v) => !v)}>
            <Monitor className="h-4 w-4" />
            <span className="ml-1.5">Venue screen</span>
          </Button>
        </div>
      </div>
      <ol>
        {rows.map((r, i) => (
          <li
            key={r.name}
            className={cn(
              "flex items-center gap-4 border-b border-border/60 px-4 last:border-0 sm:px-5 transition-colors duration-700",
              venue ? "py-5" : "py-3.5",
              flash === r.name && "bg-accent/10",
            )}
          >
            <span className={cn("w-8 font-bold tabular-nums", i === 0 ? "text-primary" : "text-muted-foreground", venue ? "text-3xl" : "text-xl")}>
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className={cn("truncate font-bold uppercase tracking-tight text-foreground", venue ? "text-xl sm:text-2xl" : "text-sm")}>
                {r.name}
              </div>
              <div className="truncate text-xs text-muted-foreground">{r.gym}</div>
            </div>
            <span className={cn("font-bold tabular-nums text-foreground", venue ? "text-3xl" : "text-lg")}>{r.points}</span>
          </li>
        ))}
      </ol>
      <p className="px-4 py-3 text-[11px] text-muted-foreground sm:px-5">
        Demo data. In a real event this board moves as judges submit from the floor.
      </p>
    </div>
  );
}
