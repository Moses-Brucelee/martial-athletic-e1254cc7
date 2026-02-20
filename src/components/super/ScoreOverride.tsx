import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { unlockWorkout, unlockScore } from "@/data/scoring";
import { Unlock } from "lucide-react";

export function ScoreOverride() {
  const [workoutId, setWorkoutId] = useState("");
  const [scoreId, setScoreId] = useState("");

  const handleUnlockWorkout = async () => {
    if (!workoutId.trim()) return;
    try {
      await unlockWorkout(workoutId.trim());
      toast.success("Workout unlocked");
      setWorkoutId("");
    } catch {
      toast.error("Failed to unlock workout");
    }
  };

  const handleUnlockScore = async () => {
    if (!scoreId.trim()) return;
    try {
      await unlockScore(scoreId.trim());
      toast.success("Score unlocked");
      setScoreId("");
    } catch {
      toast.error("Failed to unlock score");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h4 className="font-bold text-foreground text-sm uppercase">Emergency Unlock Workout</h4>
        <div className="flex gap-2">
          <Input placeholder="Workout ID" value={workoutId} onChange={(e) => setWorkoutId(e.target.value)} className="bg-background flex-1" />
          <Button onClick={handleUnlockWorkout} disabled={!workoutId.trim()} variant="destructive">
            <Unlock className="h-4 w-4 mr-1" /> Unlock
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-bold text-foreground text-sm uppercase">Emergency Unlock Score</h4>
        <div className="flex gap-2">
          <Input placeholder="Score ID" value={scoreId} onChange={(e) => setScoreId(e.target.value)} className="bg-background flex-1" />
          <Button onClick={handleUnlockScore} disabled={!scoreId.trim()} variant="destructive">
            <Unlock className="h-4 w-4 mr-1" /> Unlock
          </Button>
        </div>
      </div>
    </div>
  );
}
