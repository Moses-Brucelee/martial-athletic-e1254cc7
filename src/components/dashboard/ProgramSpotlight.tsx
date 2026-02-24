import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

export function ProgramSpotlight() {
  const navigate = useNavigate();

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
        Program Spotlight
      </h2>
      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Training Programs</h3>
            <p className="text-xs text-muted-foreground">
              Follow structured programs built by top coaches — coming soon.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs font-semibold uppercase"
          onClick={() => navigate("/browse")}
        >
          Explore Programs
        </Button>
      </div>
    </section>
  );
}
