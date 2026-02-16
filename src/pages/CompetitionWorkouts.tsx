import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { CompetitionHeader } from "@/components/CompetitionHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Plus, AlertCircle, Info, Trash2 } from "lucide-react";

interface Workout {
  id?: string;
  workout_number: number;
  measurement_type: string;
}

const MEASUREMENT_OPTIONS = ["time", "reps", "weight", "points", "distance"];

export default function CompetitionWorkouts() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  const [workouts, setWorkouts] = useState<Workout[]>([
    { workout_number: 1, measurement_type: "reps" },
    { workout_number: 2, measurement_type: "reps" },
    { workout_number: 3, measurement_type: "reps" },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data, error: fetchError } = await supabase
        .from("competition_workouts")
        .select("*")
        .eq("competition_id", id)
        .order("workout_number");

      if (fetchError) {
        setError(fetchError.message);
      } else if (data && data.length > 0) {
        setWorkouts(data.map((w) => ({
          id: w.id,
          workout_number: w.workout_number,
          measurement_type: w.measurement_type,
        })));
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const addWorkout = () => {
    const nextNum = workouts.length > 0 ? Math.max(...workouts.map((w) => w.workout_number)) + 1 : 1;
    setWorkouts([...workouts, { workout_number: nextNum, measurement_type: "reps" }]);
  };

  const removeWorkout = (index: number) => {
    if (workouts.length <= 1) return;
    setWorkouts(workouts.filter((_, i) => i !== index));
  };

  const updateMeasurement = (index: number, value: string) => {
    const updated = [...workouts];
    updated[index].measurement_type = value;
    setWorkouts(updated);
  };

  const handleSave = async () => {
    if (!id || !user) return;
    setSaving(true);
    setError("");

    // Delete existing and re-insert
    await supabase.from("competition_workouts").delete().eq("competition_id", id);

    const rows = workouts.map((w, i) => ({
      competition_id: id,
      workout_number: i + 1,
      measurement_type: w.measurement_type,
    }));

    const { error: insertError } = await supabase
      .from("competition_workouts")
      .insert(rows);

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    navigate(`/competition/${id}`);
  };

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-14 w-full" />
        <div className="max-w-2xl mx-auto p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CompetitionHeader
        title="Tournament"
        subscriptionTier={profile?.subscription_tier}
        avatarUrl={profile?.avatar_url}
        displayName={profile?.display_name}
      />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <h2 className="text-2xl font-bold text-foreground tracking-tight uppercase mb-6">
          Create Workout / Scoring Opportunities
        </h2>

        {error && (
          <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          {workouts.map((workout, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border"
            >
              <span className="text-sm font-bold text-primary whitespace-nowrap min-w-[90px]">
                Workout #{workout.workout_number}
              </span>
              <Select
                value={workout.measurement_type}
                onValueChange={(val) => updateMeasurement(index, val)}
              >
                <SelectTrigger className="h-10 bg-background flex-1">
                  <SelectValue placeholder="Select measurement" />
                </SelectTrigger>
                <SelectContent>
                  {MEASUREMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className="capitalize">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {workouts.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeWorkout(index)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addWorkout}
            className="w-full border-dashed border-accent text-accent hover:bg-accent/10"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Workout
          </Button>
        </div>

        {/* Info Banner */}
        <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-accent/10 border border-accent/20">
          <Info className="h-5 w-5 text-accent mt-0.5 shrink-0" />
          <p className="text-sm text-foreground">
            Once a team signs up to the competition, you will be able to input scores against each workout for each team.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-6"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
