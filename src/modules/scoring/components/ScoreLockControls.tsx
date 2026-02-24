import { Button } from "@/components/ui/button";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { useWorkouts } from "@/modules/tournaments/hooks";
import { useLockWorkout, useUnlockWorkout } from "@/modules/scoring/hooks";

interface ScoreLockControlsProps {
  competitionId: string;
  canAdmin: boolean;
  isSuperUser: boolean;
}

export function ScoreLockControls({ competitionId, canAdmin, isSuperUser }: ScoreLockControlsProps) {
  const { data: workouts = [] } = useWorkouts(competitionId);
  const lockMutation = useLockWorkout();
  const unlockMutation = useUnlockWorkout();

  const handleToggle = async (workout: { id: string; workout_number: number; is_locked: boolean }) => {
    try {
      if (workout.is_locked) {
        if (!isSuperUser && !canAdmin) {
          toast.error("Only super users can unlock");
          return;
        }
        await unlockMutation.mutateAsync({ workoutId: workout.id, competitionId });
        toast.success(`Workout #${workout.workout_number} unlocked`);
      } else {
        await lockMutation.mutateAsync({ workoutId: workout.id, competitionId });
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
        <Button key={w.id} size="sm" variant={w.is_locked ? "destructive" : "outline"}
          onClick={() => handleToggle(w)} disabled={!canAdmin && !isSuperUser} className="text-xs">
          {w.is_locked ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
          WOD {w.workout_number}
        </Button>
      ))}
    </div>
  );
}
