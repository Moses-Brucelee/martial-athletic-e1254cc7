import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useCreateCompetition } from "@/modules/tournaments/hooks";
import { CompetitionHeader } from "@/components/CompetitionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, AlertCircle, Info } from "lucide-react";
import { competitionSchema, sanitizeError } from "@/lib/validation";

export default function CompetitionCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const createMutation = useCreateCompetition();

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [type, setType] = useState("");
  const [hostGym, setHostGym] = useState("");
  const [divisions, setDivisions] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validation = competitionSchema.safeParse({ name, venue, type, hostGym, divisions });
  const liveFieldErrors: Record<string, string> = {};
  if (!validation.success) {
    validation.error.issues.forEach((issue) => {
      const key = String(issue.path[0]);
      if (!liveFieldErrors[key]) liveFieldErrors[key] = issue.message;
    });
  }
  const isFormValid = validation.success;

  const handleCreate = async () => {
    if (!user) return;
    setFieldErrors({});
    setError("");

    const result = competitionSchema.safeParse({ name, venue, type, hostGym, divisions });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = String(issue.path[0]);
        if (!errs[key]) errs[key] = issue.message;
      });
      setFieldErrors(errs);
      return;
    }

    try {
      const comp = await createMutation.mutateAsync({
        created_by: user.id,
        name: name.trim(),
        date: date || null,
        venue: venue || null,
        type: type || null,
        host_gym: hostGym || null,
        divisions: divisions || null,
      });
      navigate(`/competition/${comp.id}/workouts`);
    } catch (err) {
      setError(sanitizeError(err));
    }
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CompetitionHeader title="Tournament" avatarUrl={profile?.avatar_url} displayName={profile?.display_name} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <h2 className="text-2xl font-bold text-foreground tracking-tight uppercase mb-6">Create Your Competition</h2>

        {error && (
          <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-foreground font-medium">Competition Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                placeholder="Enter competition name" className="h-11 bg-background" disabled={createMutation.isPending} maxLength={100} />
              {touched.name && liveFieldErrors.name && <p className="text-xs text-destructive">{liveFieldErrors.name}</p>}
              {!touched.name && !name && <p className="text-xs text-muted-foreground">Required</p>}
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 bg-background" disabled={createMutation.isPending} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Venue</Label>
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Venue location" className="h-11 bg-background" disabled={createMutation.isPending} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Type</Label>
              <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. CrossFit, MMA" className="h-11 bg-background" disabled={createMutation.isPending} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground font-medium">Host Gym</Label>
              <Input value={hostGym} onChange={(e) => setHostGym(e.target.value)} placeholder="Host gym name" className="h-11 bg-background" disabled={createMutation.isPending} maxLength={100} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-foreground font-medium">Divisions</Label>
              <Input value={divisions} onChange={(e) => setDivisions(e.target.value)} placeholder="e.g. RX, Scaled, Masters" className="h-11 bg-background" disabled={createMutation.isPending} maxLength={200} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-accent/10 border border-accent/20">
          <Info className="h-5 w-5 text-accent mt-0.5 shrink-0" />
          <p className="text-sm text-foreground">Details entered below in the selected fields will be displayed in the advertisement similar to the below.</p>
        </div>

        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={() => navigate("/dashboard")} disabled={createMutation.isPending}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending || !isFormValid}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-6">
            {createMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Next <ChevronRight className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
