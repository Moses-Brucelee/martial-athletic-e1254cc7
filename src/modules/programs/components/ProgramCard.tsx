import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, CalendarDays } from "lucide-react";
import type { Program } from "../types";
import { PROGRAM_CATEGORIES } from "../types";

export function ProgramCard({ program }: { program: Program }) {
  const navigate = useNavigate();
  const category = PROGRAM_CATEGORIES.find((c) => c.key === program.category)?.label ?? program.category;

  return (
    <button
      type="button"
      onClick={() => navigate(`/programs/${program.id}`)}
      className="text-left w-full rounded-xl border border-border bg-card p-4 space-y-2 hover:border-primary/60 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground leading-tight">{program.title}</h3>
        <Badge variant="secondary" className="text-[10px] shrink-0 uppercase">{category}</Badge>
      </div>
      {program.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{program.description}</p>
      )}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" /> {program.weeks_count} weeks
        </span>
        <span className="flex items-center gap-1">
          <Dumbbell className="h-3.5 w-3.5" /> {program.days_per_week}/week
        </span>
        {program.status !== "published" && (
          <Badge variant="outline" className="text-[10px] uppercase">{program.status}</Badge>
        )}
      </div>
    </button>
  );
}
