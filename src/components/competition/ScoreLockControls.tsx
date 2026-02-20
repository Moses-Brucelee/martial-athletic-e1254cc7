import { Button } from "@/components/ui/button";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { lockWorkout, unlockWorkout } from "@/data/scoring";
import type { Workout } from "@/domain/competition";

interface ScoreLockControlsProps {
  workouts: Workout[];
  setWorkouts: React.Dispatch<React.SetStateAction<Workout[]>>;
  canAdmin: boolean;
  isSuperUser: boolean;
}

export function ScoreLockControls({ workouts, setWorkouts, canAdmin, isSuperUser }: ScoreLockControlsProps) {
  const handleToggle = async (workout: Workout) => {
    try {
      if (workout.is_locked) {
        if (!isSuperUser && !canAdmin) {
          toast.error("Only super users can unlock");
          return;
        }
        await unlockWorkout(workout.id);
        setWorkouts((prev) => prev.map((w) => w.id === workout.id ? { ...w, is_locked: false } : w));
        toast.success(`Workout #${workout.workout_number} unlocked`);
      } else {
        await lockWorkout(workout.id);
        setWorkouts((prev) => prev.map((w) => w.id === workout.id ? { ...w, is_locked: true } : w));
        toast.success(`Workout #${workout.workout_number} locked`);
      }
    } catch {
      toast.error("Failed to toggle lock");
    }
  };

  if (workouts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {workouts.map((w) => (
        <Button
          key={w.id}
          size="sm"
          variant={w.is_locked ? "destructive" : "outline"}
          onClick={() => handleToggle(w)}
          disabled={!canAdmin && !isSuperUser}
          className="text-xs"
        >
          {w.is_locked ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
          WOD {w.workout_number}
        </Button>
      ))}
    </div>
  );
}
