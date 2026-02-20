import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Dumbbell, Lock } from "lucide-react";

interface Workout {
  id: string;
  workout_number: number;
  measurement_type: string;
  name: string | null;
  is_locked?: boolean;
}

const MEASUREMENT_OPTIONS = ["time", "reps", "weight", "points", "distance"];

interface WorkoutsPanelProps {
  competitionId: string;
  workouts: Workout[];
  setWorkouts: React.Dispatch<React.SetStateAction<Workout[]>>;
  isOwner: boolean;
}

export function WorkoutsPanel({ competitionId, workouts, setWorkouts, isOwner }: WorkoutsPanelProps) {
  const addWorkout = async () => {
    const nextNum = workouts.length > 0 ? Math.max(...workouts.map((w) => w.workout_number)) + 1 : 1;
    const { data, error } = await supabase
      .from("competition_workouts")
      .insert({ competition_id: competitionId, workout_number: nextNum, measurement_type: "reps" })
      .select()
      .single();

    if (!error && data) {
      setWorkouts((prev) => [...prev, { ...data, is_locked: false } as Workout]);
    }
  };

  const removeWorkout = async (workoutId: string) => {
    await supabase.from("competition_workouts").delete().eq("id", workoutId);
    setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
  };

  const updateMeasurement = async (workoutId: string, measurement: string) => {
    await supabase.from("competition_workouts").update({ measurement_type: measurement }).eq("id", workoutId);
    setWorkouts((prev) => prev.map((w) => (w.id === workoutId ? { ...w, measurement_type: measurement } : w)));
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Dumbbell className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground uppercase">Workouts</h3>
      </div>

      {workouts.length === 0 && (
        <p className="text-sm text-muted-foreground mb-4">No workouts yet.</p>
      )}

      <div className="space-y-3 mb-4">
        {workouts.map((workout) => (
          <div key={workout.id} className="rounded-lg border border-border overflow-hidden">
            <div className="bg-destructive/80 text-destructive-foreground text-xs font-bold uppercase tracking-wider px-3 py-1.5 text-center flex items-center justify-center gap-1">
              Workout #{workout.workout_number}
              {workout.is_locked && <Lock className="h-3 w-3" />}
            </div>
            <div className="p-3 bg-background space-y-2">
              <p className="text-xs text-muted-foreground">
                Total: <span className="capitalize font-medium text-foreground">{workout.measurement_type}</span> (Scoring Opportunity)
              </p>
              {isOwner && !workout.is_locked ? (
                <div className="flex items-center gap-2">
                  <Select value={workout.measurement_type} onValueChange={(val) => updateMeasurement(workout.id, val)}>
                    <SelectTrigger className="h-8 bg-card text-sm flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEASUREMENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeWorkout(workout.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {isOwner && (
        <Button variant="outline" onClick={addWorkout} className="w-full border-dashed border-accent text-accent hover:bg-accent/10">
          <Plus className="h-4 w-4 mr-2" />
          Add Workout
        </Button>
      )}
    </div>
  );
}
