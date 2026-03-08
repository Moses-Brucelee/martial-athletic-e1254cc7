import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useCreateCompetition, useSaveWorkoutWithMovements } from "@/modules/tournaments/hooks";
import { CompetitionHeader } from "@/components/CompetitionHeader";
import { DivisionsPanel } from "@/modules/tournaments/components/DivisionsPanel";
import { WorkoutBuilder, emptyWorkout, type LocalWorkout } from "@/modules/tournaments/components/WorkoutBuilder";
import { TemplateSelector, type TemplateData } from "@/modules/tournaments/components/TemplateSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { ChevronLeft, ChevronRight, AlertCircle, Check } from "lucide-react";
import { competitionSchema, sanitizeError } from "@/lib/validation";
import { toast } from "sonner";

const STEPS = ["Core Setup", "Divisions", "Workouts"];

export default function CompetitionCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const createMutation = useCreateCompetition();
  const saveWorkoutMutation = useSaveWorkoutWithMovements();

  const [step, setStep] = useState(0);
  const [competitionId, setCompetitionId] = useState<string | null>(null);

  // Step 1 fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [type, setType] = useState("");
  const [hostGym, setHostGym] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [regDeadline, setRegDeadline] = useState("");
  const [ageCategoryType, setAgeCategoryType] = useState("open");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Step 3 fields
  const [workouts, setWorkouts] = useState<LocalWorkout[]>([emptyWorkout()]);

  const handleTemplateSelect = (_template: any, data: TemplateData) => {
    if (data.competition_type) setType(data.competition_type);
    if (data.age_category_type) setAgeCategoryType(data.age_category_type);
    if (data.min_age != null) setMinAge(String(data.min_age));
    if (data.max_age != null) setMaxAge(String(data.max_age));
    if (data.workouts && data.workouts.length > 0) {
      setWorkouts(data.workouts.map((w) => ({
        name: w.name || "",
        workout_type: w.workout_type || "amrap",
        time_cap_seconds: w.time_cap_seconds ? String(w.time_cap_seconds) : "",
        scoring_type: w.scoring_type || "reps",
        movements: [{ movement_name: "", reps: "", weight: "", unit: "kg" }],
      })));
    }
    toast.success("Template applied!");
  };

  const validation = competitionSchema.safeParse({ name, venue, type, hostGym });
  const liveFieldErrors: Record<string, string> = {};
  if (!validation.success) {
    validation.error.issues.forEach((issue) => {
      const key = String(issue.path[0]);
      if (!liveFieldErrors[key]) liveFieldErrors[key] = issue.message;
    });
  }

  const isStep1Valid = validation.success && !!startDate && !!endDate && !!regDeadline;

  const handleStep1Next = async () => {
    if (!user) return;
    setError("");
    try {
      const comp = await createMutation.mutateAsync({
        created_by: user.id,
        name: name.trim(),
        description: description || null,
        date: startDate || null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        registration_deadline: regDeadline ? new Date(regDeadline).toISOString() : null,
        venue: venue || null,
        type: type || null,
        host_gym: hostGym || null,
        age_category_type: ageCategoryType,
        min_age: minAge ? parseInt(minAge) : null,
        max_age: maxAge ? parseInt(maxAge) : null,
      });
      setCompetitionId(comp.id);
      setStep(1);
    } catch (err) {
      setError(sanitizeError(err));
    }
  };

  const handleStep3Save = async () => {
    if (!competitionId) return;
    setError("");

    // Validate workouts have at least one movement with a name
    for (let i = 0; i < workouts.length; i++) {
      const w = workouts[i];
      if (w.movements.length === 0 || !w.movements.some((m) => m.movement_name.trim())) {
        toast.error(`Workout #${i + 1} needs at least one named movement`);
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
          workout_type: w.workout_type,
          time_cap_seconds: w.time_cap_seconds ? parseInt(w.time_cap_seconds) : null,
          scoring_type: w.scoring_type,
          measurement_type: w.scoring_type, // map scoring_type to measurement_type
          movements: w.movements
            .filter((m) => m.movement_name.trim())
            .map((m, mi) => ({
              movement_name: m.movement_name.trim(),
              reps: m.reps ? parseInt(m.reps) : null,
              weight: m.weight ? parseFloat(m.weight) : null,
              unit: m.unit,
              sequence_order: mi,
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CompetitionHeader title="Tournament" avatarUrl={profile?.avatar_url} displayName={profile?.display_name} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-6 ${i <= step ? "bg-accent" : "bg-border"}`} />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                i === step ? "bg-primary text-primary-foreground" :
                i < step ? "bg-accent/20 text-accent-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < step && <Check className="h-3 w-3" />}
                {label}
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-foreground tracking-tight uppercase mb-6">
          {step === 0 ? "Core Setup" : step === 1 ? "Divisions" : "Workouts"}
        </h2>

        {error && (
          <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Step 1: Core Setup */}
        {step === 0 && <TemplateSelector onSelect={handleTemplateSelect} />}
        {step === 0 && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-foreground font-medium">Competition Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                  placeholder="Enter competition name" className="h-11 bg-background" disabled={isPending} maxLength={100} />
                {touched.name && liveFieldErrors.name && <p className="text-xs text-destructive">{liveFieldErrors.name}</p>}
                {!touched.name && !name && <p className="text-xs text-muted-foreground">Required</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-foreground font-medium">Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the competition" className="bg-background min-h-[80px]" disabled={isPending} maxLength={500} />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Start Date *</Label>
                <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 bg-background" disabled={isPending} />
                {!startDate && <p className="text-xs text-muted-foreground">Required</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-medium">End Date *</Label>
                <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="h-11 bg-background" disabled={isPending} />
                {!endDate && <p className="text-xs text-muted-foreground">Required</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Registration Deadline *</Label>
                <Input type="datetime-local" value={regDeadline} onChange={(e) => setRegDeadline(e.target.value)}
                  className="h-11 bg-background" disabled={isPending} />
                {!regDeadline && <p className="text-xs text-muted-foreground">Required</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Venue</Label>
                <Input value={venue} onChange={(e) => setVenue(e.target.value)}
                  placeholder="Venue location" className="h-11 bg-background" disabled={isPending} maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Type</Label>
                <Input value={type} onChange={(e) => setType(e.target.value)}
                  placeholder="e.g. CrossFit, MMA" className="h-11 bg-background" disabled={isPending} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Host Gym</Label>
                <Input value={hostGym} onChange={(e) => setHostGym(e.target.value)}
                  placeholder="Host gym name" className="h-11 bg-background" disabled={isPending} maxLength={100} />
              </div>
            </div>

            {/* Age Category */}
            <div className="border-t border-border pt-5 space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Age Category</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Category Type</Label>
                  <Select value={ageCategoryType} onValueChange={setAgeCategoryType} disabled={isPending}>
                    <SelectTrigger className="h-11 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open (No Limits)</SelectItem>
                      <SelectItem value="under_x">Under X</SelectItem>
                      <SelectItem value="age_range">Age Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {ageCategoryType === "age_range" && (
                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">Min Age</Label>
                    <Input type="number" value={minAge} onChange={(e) => setMinAge(e.target.value)}
                      placeholder="e.g. 35" className="h-11 bg-background" disabled={isPending} min={0} max={120} />
                  </div>
                )}
                {(ageCategoryType === "under_x" || ageCategoryType === "age_range") && (
                  <div className="space-y-2">
                    <Label className="text-foreground font-medium">Max Age</Label>
                    <Input type="number" value={maxAge} onChange={(e) => setMaxAge(e.target.value)}
                      placeholder={ageCategoryType === "under_x" ? "e.g. 17" : "e.g. 40"}
                      className="h-11 bg-background" disabled={isPending} min={0} max={120} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Divisions */}
        {step === 1 && competitionId && (
          <DivisionsPanel competitionId={competitionId} canAdmin={true} />
        )}

        {/* Step 3: Workouts */}
        {step === 2 && (
          <WorkoutBuilder workouts={workouts} setWorkouts={setWorkouts} disabled={isPending} />
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => step === 0 ? navigate("/dashboard") : setStep(step - 1)} disabled={isPending}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < 2 ? (
            <Button
              onClick={step === 0 ? handleStep1Next : () => setStep(2)}
              disabled={isPending || (step === 0 && !isStep1Valid)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-6">
              {isPending ? (
                <div className="w-5 h-5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Next <ChevronRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          ) : (
            <Button onClick={handleStep3Save} disabled={isPending}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-6">
              {isPending ? (
                <div className="w-5 h-5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Create Competition <Check className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
