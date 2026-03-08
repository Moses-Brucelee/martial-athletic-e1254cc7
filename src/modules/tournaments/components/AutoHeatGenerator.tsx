import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Users } from "lucide-react";
import { toast } from "sonner";
import { useTeams, useWorkouts } from "@/modules/tournaments/hooks";
import { useAddHeat, useHeats } from "@/modules/tournaments/hooks-engine";
import { assignTeamToHeat } from "@/modules/tournaments/api-engine";
import { useQueryClient } from "@tanstack/react-query";

interface AutoHeatGeneratorProps {
  competitionId: string;
}

export function AutoHeatGenerator({ competitionId }: AutoHeatGeneratorProps) {
  const { data: teams = [] } = useTeams(competitionId);
  const { data: workouts = [] } = useWorkouts(competitionId);
  const { data: existingHeats = [] } = useHeats(competitionId);
  const addHeatMutation = useAddHeat();
  const qc = useQueryClient();

  const [selectedWorkoutId, setSelectedWorkoutId] = useState("");
  const [laneCount, setLaneCount] = useState("10");
  const [generating, setGenerating] = useState(false);

  const lanes = parseInt(laneCount) || 10;
  const heatCount = teams.length > 0 ? Math.ceil(teams.length / lanes) : 0;

  const handleGenerate = async () => {
    if (!selectedWorkoutId) {
      toast.error("Select a workout first");
      return;
    }
    if (teams.length === 0) {
      toast.error("No teams to assign");
      return;
    }

    // Check if heats already exist for this workout
    const existing = existingHeats.filter((h) => h.workout_id === selectedWorkoutId);
    if (existing.length > 0) {
      toast.error(`${existing.length} heats already exist for this workout. Delete them first to regenerate.`);
      return;
    }

    setGenerating(true);
    try {
      const shuffled = [...teams].sort(() => Math.random() - 0.5);

      for (let heatIdx = 0; heatIdx < heatCount; heatIdx++) {
        const heatTeams = shuffled.slice(heatIdx * lanes, (heatIdx + 1) * lanes);

        const heat = await addHeatMutation.mutateAsync({
          competition_id: competitionId,
          workout_id: selectedWorkoutId,
          heat_number: heatIdx + 1,
          lane_count: lanes,
        });

        // Assign teams to lanes
        for (let laneIdx = 0; laneIdx < heatTeams.length; laneIdx++) {
          await assignTeamToHeat(heat.id, heatTeams[laneIdx].id, laneIdx + 1);
        }
      }

      qc.invalidateQueries({ queryKey: ["heats", competitionId] });
      toast.success(`${heatCount} heats generated with ${teams.length} athletes assigned`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Auto-Generate Heats</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Workout</Label>
          <Select value={selectedWorkoutId} onValueChange={setSelectedWorkoutId}>
            <SelectTrigger className="h-9 bg-background text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {workouts.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name || `WOD #${w.workout_number}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Lanes per Heat</Label>
          <Input type="number" value={laneCount} onChange={(e) => setLaneCount(e.target.value)}
            className="h-9 bg-background text-sm" min={1} max={50} />
        </div>
        <div className="flex items-end">
          <Button onClick={handleGenerate} disabled={generating || !selectedWorkoutId || teams.length === 0}
            className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full">
            <Zap className="h-4 w-4 mr-1" />
            {generating ? "Generating…" : "Generate"}
          </Button>
        </div>
      </div>

      {teams.length > 0 && selectedWorkoutId && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>{teams.length} athletes → {heatCount} heats × {lanes} lanes</span>
        </div>
      )}
    </div>
  );
}
