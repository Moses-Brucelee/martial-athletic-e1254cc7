import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkouts, useAddWorkout, useRemoveWorkout, useUpdateWorkoutMeasurement } from "@/modules/tournaments/hooks";

const MEASUREMENT_OPTIONS = ["time", "reps", "weight", "points", "distance"];

interface WorkoutsPanelProps {
  competitionId: string;
  isOwner: boolean;
}

export function WorkoutsPanel({ competitionId, isOwner }: WorkoutsPanelProps) {
  const { data: workouts = [], isLoading } = useWorkouts(competitionId);
  const addMutation = useAddWorkout();
  const removeMutation = useRemoveWorkout();
  const updateMutation = useUpdateWorkoutMeasurement();

  const handleAdd = async () => {
    const nextNum = workouts.length > 0 ? Math.max(...workouts.map((w) => w.workout_number)) + 1 : 1;
    try {
      await addMutation.mutateAsync({
        competition_id: competitionId,
        workout_number: nextNum,
        measurement_type: "reps",
      });
      toast.success("Workout added!");
    } catch {
      toast.error("Failed to add workout");
    }
  };

  const handleRemove = async (workoutId: string) => {
    try {
      await removeMutation.mutateAsync({ workoutId, competitionId });
      toast.success("Workout removed");
    } catch {
      toast.error("Failed to remove workout");
    }
  };

  const handleUpdateMeasurement = async (workoutId: string, measurement: string) => {
    try {
      await updateMutation.mutateAsync({ workoutId, measurement, competitionId });
    } catch {
      toast.error("Failed to update measurement");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Dumbbell className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground uppercase">Workouts</h3>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : workouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No workouts yet.</p>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => (
            <div key={w.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
              <span className="text-sm font-bold text-primary whitespace-nowrap min-w-[90px]">
                Workout #{w.workout_number}
              </span>
              <span className="text-xs text-muted-foreground capitalize">Total: {w.measurement_type}</span>
              {isOwner && (
                <>
                  <Select value={w.measurement_type} onValueChange={(val) => handleUpdateMeasurement(w.id, val)}>
                    <SelectTrigger className="h-8 w-28 bg-background text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEASUREMENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt} className="capitalize text-xs">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive ml-auto"
                    onClick={() => handleRemove(w.id)} aria-label="Remove workout">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <Button variant="outline" onClick={handleAdd} disabled={addMutation.isPending}
          className="w-full mt-4 border-dashed border-accent text-accent hover:bg-accent/10">
          <Plus className="h-4 w-4 mr-2" /> Add Workout
        </Button>
      )}
    </div>
  );
}
