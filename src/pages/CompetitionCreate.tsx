import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useCreateCompetition, useSaveWorkoutWithMovements } from "@/modules/tournaments/hooks";
import { CompetitionHeader } from "@/components/CompetitionHeader";
import { StepIndicator } from "@/modules/tournaments/components/create/StepIndicator";
import { StepDetails } from "@/modules/tournaments/components/create/StepDetails";
import { StepSportType } from "@/modules/tournaments/components/create/StepSportType";
import { DivisionsPanel } from "@/modules/tournaments/components/DivisionsPanel";
import { WorkoutBuilderPro } from "@/modules/tournaments/components/workout-builder/WorkoutBuilderPro";
import { emptyWorkout, type LocalWorkout } from "@/modules/tournaments/components/workout-builder/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, AlertCircle, Check } from "lucide-react";
import { sanitizeError } from "@/lib/validation";
import { toast } from "sonner";

const STEPS = ["Details", "Sport", "Divisions", "Workouts"];

export default function CompetitionCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const createMutation = useCreateCompetition();
  const saveWorkoutMutation = useSaveWorkoutWithMovements();

  const [step, setStep] = useState(0);
  const [competitionId, setCompetitionId] = useState<string | null>(null);

  // Step 1 — Details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [hostGym, setHostGym] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [regDeadline, setRegDeadline] = useState<Date | undefined>();
  const [error, setError] = useState("");

  // Step 2 — Sport type
  const [competitionType, setCompetitionType] = useState("");

  // Step 4 — Workouts
  const [workouts, setWorkouts] = useState<LocalWorkout[]>([emptyWorkout()]);

  const isStep1Valid = name.trim().length >= 2 && !!startDate && !!endDate && !!regDeadline;
  const isStep2Valid = !!competitionType;

  const handleCreateCompetition = async () => {
    if (!user) return;
    setError("");
    try {
      const comp = await createMutation.mutateAsync({
        created_by: user.id,
        name: name.trim(),
        description: description || null,
        date: startDate ? startDate.toISOString().split("T")[0] : null,
        start_date: startDate ? startDate.toISOString() : null,
        end_date: endDate ? endDate.toISOString() : null,
        registration_deadline: regDeadline ? regDeadline.toISOString() : null,
        venue: venue || null,
        type: competitionType || null,
        competition_type: competitionType || null,
        host_gym: hostGym || null,
      });
      setCompetitionId(comp.id);
      setStep(2);
    } catch (err) {
      setError(sanitizeError(err));
    }
  };

  const handleSaveWorkouts = async () => {
    if (!competitionId) return;
    setError("");

    for (let i = 0; i < workouts.length; i++) {
      const w = workouts[i];
      if (w.movements.length === 0 || !w.movements.some((m) => m.movement_name.trim())) {
        toast.error(`Workout #${i + 1} needs at least one named movement`);
        return;
      }
      if (w.workout_type === "amrap" && !w.time_cap_seconds) {
        toast.error(`Workout #${i + 1}: AMRAP requires a time cap`);
        return;
      }
    }

    try {
      for (let i = 0; i < workouts.length; i++) {
        const w = workouts[i];
        await saveWorkoutMutation.mutateAsync({
          competition_id: competitionId,
          workout_number: i + 1,
          name: w.name || null,
          description: w.description || null,
          workout_type: w.workout_type,
          time_cap_seconds: w.time_cap_seconds ? parseInt(w.time_cap_seconds) : null,
          scoring_type: w.scoring_type,
          measurement_type: w.scoring_type,
          movements: w.movements
            .filter((m) => m.movement_name.trim())
            .map((m, mi) => ({
              movement_name: m.movement_name.trim(),
              reps: m.reps ? parseInt(m.reps) : null,
              weight: m.weight ? parseFloat(m.weight) : null,
              unit: m.unit,
              sequence_order: mi,
              distance: m.distance ? parseFloat(m.distance) : null,
              calories: m.calories ? parseInt(m.calories) : null,
              description: m.description || null,
              video_url: m.video_url || null,
            })),
        });
      }
      toast.success("Competition created!");
      navigate(`/competition/${competitionId}`);
    } catch (err) {
      setError(sanitizeError(err));
    }
  };

  const isPending = createMutation.isPending || saveWorkoutMutation.isPending;

  const handleNext = () => {
    if (step === 1) {
      handleCreateCompetition();
    } else if (step === 3) {
      handleSaveWorkouts();
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step === 0) {
      navigate("/dashboard");
    } else if (step > 2 || !competitionId) {
      setStep(step - 1);
    }
  };

  const isNextDisabled = () => {
    if (isPending) return true;
    if (step === 0) return !isStep1Valid;
    if (step === 1) return !isStep2Valid;
    return false;
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-14 w-full" />
        <div className="max-w-2xl mx-auto p-6 space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  const isWorkoutsStep = step === 3;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CompetitionHeader title="Create Competition" avatarUrl={profile?.avatar_url} displayName={profile?.display_name} />

      <main className={`flex-1 w-full px-3 sm:px-4 py-6 sm:py-8 ${isWorkoutsStep ? "max-w-7xl mx-auto" : "max-w-2xl mx-auto"}`}>
        <StepIndicator steps={STEPS} currentStep={step} />

        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight uppercase mb-6">
          {STEPS[step]}
        </h2>

        {error && (
          <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="pb-20 sm:pb-0">
          {step === 0 && (
            <StepDetails
              name={name} setName={setName}
              description={description} setDescription={setDescription}
              venue={venue} setVenue={setVenue}
              hostGym={hostGym} setHostGym={setHostGym}
              startDate={startDate} setStartDate={setStartDate}
              endDate={endDate} setEndDate={setEndDate}
              regDeadline={regDeadline} setRegDeadline={setRegDeadline}
              disabled={isPending}
            />
          )}

          {step === 1 && (
            <StepSportType
              selected={competitionType}
              onSelect={setCompetitionType}
              disabled={isPending}
            />
          )}

          {step === 2 && competitionId && (
            <DivisionsPanel competitionId={competitionId} canAdmin={true} />
          )}

          {step === 3 && (
            <WorkoutBuilderPro workouts={workouts} setWorkouts={setWorkouts} disabled={isPending} />
          )}
        </div>
      </main>

      {/* Sticky bottom nav on mobile */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border p-3 sm:relative sm:border-0 sm:bg-transparent sm:backdrop-blur-none sm:p-0">
        <div className={`flex justify-between ${isWorkoutsStep ? "max-w-7xl" : "max-w-2xl"} mx-auto sm:px-4 sm:pb-8`}>
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isPending || (step === 2 && !!competitionId)}
            className="h-11 sm:h-10"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={isNextDisabled()}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-6 h-11 sm:h-10"
          >
            {isPending ? (
              <div className="w-5 h-5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
            ) : step === 3 ? (
              <>Create Competition <Check className="h-4 w-4 ml-1" /></>
            ) : (
              <>Next <ChevronRight className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
