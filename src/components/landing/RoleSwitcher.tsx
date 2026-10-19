import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const ROLES = {
  host: {
    label: "Host",
    title: "You run the event",
    points: ["Build divisions and workouts in a short wizard", "Open registration with one share link", "Plan heats and lanes without lane clashes", "Lock scores when they're final"],
  },
  athlete: {
    label: "Athlete",
    title: "You compete",
    points: ["Find events near you and sign up in minutes", "See your heat time and lane ahead of the day", "Follow the leaderboard live from your phone", "Keep your results and PBs in one profile"],
  },
  judge: {
    label: "Judge",
    title: "You score the floor",
    points: ["Get your lane assignment per heat", "Enter reps, time or load on your phone", "Partial For Time scores handled properly", "No paper sheets to collect afterwards"],
  },
} as const;

export function RoleSwitcher() {
  const [role, setRole] = useState<keyof typeof ROLES>("host");
  const r = ROLES[role];
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <div className="flex gap-2 overflow-x-auto lg:flex-col">
        {(Object.keys(ROLES) as (keyof typeof ROLES)[]).map((k) => (
          <button
            key={k}
            onClick={() => setRole(k)}
            className={cn(
              "min-h-[48px] flex-1 rounded-md border px-5 text-left text-sm font-bold uppercase tracking-widest transition-colors lg:flex-none",
              role === k ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            I'm a {ROLES[k].label}
          </button>
        ))}
      </div>
      <div key={role} className="animate-fade-in rounded-lg border border-border bg-card p-6 sm:p-8">
        <h3 className="text-2xl font-bold uppercase tracking-tight text-foreground">{r.title}</h3>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {r.points.map((p) => (
            <li key={p} className="flex gap-3 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
