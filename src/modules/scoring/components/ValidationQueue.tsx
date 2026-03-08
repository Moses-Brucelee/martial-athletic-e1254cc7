import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useScores } from "@/modules/scoring/hooks";
import { useTeams, useWorkouts } from "@/modules/tournaments/hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface ValidationQueueProps {
  competitionId: string;
}

export function ValidationQueue({ competitionId }: ValidationQueueProps) {
  const { data: scoreRows = [] } = useScores(competitionId);
  const { data: teams = [] } = useTeams(competitionId);
  const { data: workouts = [] } = useWorkouts(competitionId);
  const qc = useQueryClient();

  const teamMap = useMemo(() => {
    const m: Record<string, string> = {};
    teams.forEach((t) => { m[t.id] = t.team_name; });
    return m;
  }, [teams]);

  const workoutMap = useMemo(() => {
    const m: Record<string, number> = {};
    workouts.forEach((w) => { m[w.id] = w.workout_number; });
    return m;
  }, [workouts]);

  const pendingScores = scoreRows.filter(
    (s) => !s.validation_status || s.validation_status === "pending"
  );

  const handleValidate = async (scoreId: string, status: "validated" | "rejected") => {
    const { error } = await supabase
      .from("competition_scores")
      .update({ validation_status: status })
      .eq("id", scoreId);
    if (error) {
      toast.error("Failed to update validation");
      return;
    }
    toast.success(status === "validated" ? "Score validated" : "Score rejected");
    qc.invalidateQueries({ queryKey: ["scores", competitionId] });
  };

  const handleBatchValidate = async () => {
    const ids = pendingScores.map((s) => s.id);
    if (ids.length === 0) return;

    for (const id of ids) {
      await supabase
        .from("competition_scores")
        .update({ validation_status: "validated" })
        .eq("id", id);
    }
    toast.success(`${ids.length} scores validated`);
    qc.invalidateQueries({ queryKey: ["scores", competitionId] });
  };

  if (pendingScores.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 bg-accent/10 rounded-lg border border-accent/20">
        <CheckCircle className="h-4 w-4 text-accent" />
        <p className="text-sm text-foreground">All scores validated — no items in queue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-bold text-foreground">
            {pendingScores.length} pending validation
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={handleBatchValidate}>
          <CheckCircle className="h-3.5 w-3.5 mr-1" />
          Validate All
        </Button>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {pendingScores.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {teamMap[s.team_id] || "Unknown Team"}
              </p>
              <p className="text-xs text-muted-foreground">
                WOD {workoutMap[s.workout_id] || "?"} · Score: {s.score}
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">Pending</Badge>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-accent hover:text-accent"
                onClick={() => handleValidate(s.id, "validated")}>
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => handleValidate(s.id, "rejected")}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
