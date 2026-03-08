import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useCompetition, useTeams, useDivisions, useWorkouts } from "@/modules/tournaments/hooks";
import { deriveStatus, getStatusLabel, getStatusColor } from "@/modules/tournaments/stateMachine";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Clock, Users, Dumbbell, AlertCircle, CheckCircle2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { differenceInYears } from "date-fns";

// Fetch registrations for a competition
async function fetchRegistrations(competitionId: string) {
  const { data, error } = await supabase
    .from("athlete_registrations")
    .select("*")
    .eq("competition_id", competitionId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export default function CompetitionPublic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: competition, isLoading, error } = useCompetition(id);
  const { data: teams = [] } = useTeams(id);
  const { data: divisions = [] } = useDivisions(id);
  const { data: workouts = [] } = useWorkouts(id);
  const qc = useQueryClient();

  const { data: registrations = [] } = useQuery({
    queryKey: ["registrations", id],
    queryFn: () => fetchRegistrations(id!),
    enabled: !!id,
  });

  const [athleteName, setAthleteName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const derivedStatus = competition ? deriveStatus(competition) : "draft";
  const canRegister = derivedStatus === "published" || derivedStatus === "live";
  const isDeadlinePassed = competition?.registration_deadline
    ? new Date() > new Date(competition.registration_deadline)
    : false;
  const registrationOpen = canRegister && !isDeadlinePassed;

  // Check if current user already registered
  const alreadyRegistered = user
    ? registrations.some((r) => r.user_id === user.id)
    : false;

  // Age eligibility check
  const checkAgeEligibility = (): string | null => {
    if (!competition || competition.age_category_type === "open" || !competition.age_category_type) return null;
    if (!profile?.date_of_birth) return "Your profile is missing a date of birth. Please update your profile first.";

    const startDate = competition.start_date ? new Date(competition.start_date) : new Date();
    const age = differenceInYears(startDate, new Date(profile.date_of_birth));

    if (competition.age_category_type === "under_x" && competition.max_age != null) {
      if (age >= competition.max_age) return `You must be under ${competition.max_age} to register. Your age at competition: ${age}.`;
    }
    if (competition.age_category_type === "age_range") {
      if (competition.min_age != null && age < competition.min_age)
        return `You must be at least ${competition.min_age} to register. Your age at competition: ${age}.`;
      if (competition.max_age != null && age > competition.max_age)
        return `You must be ${competition.max_age} or under to register. Your age at competition: ${age}.`;
    }
    return null;
  };

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("You must be logged in");
      const name = athleteName.trim() || profile?.display_name || "Unknown";

      const { error } = await supabase.from("athlete_registrations").insert({
        competition_id: id,
        user_id: user.id,
        athlete_name: name,
        team_id: selectedTeamId || null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registrations", id] });
      toast.success("Registration submitted!");
      setAthleteName("");
      setSelectedTeamId("");
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const handleRegister = () => {
    const ageError = checkAgeEligibility();
    if (ageError) {
      toast.error(ageError);
      return;
    }
    registerMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !competition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-foreground font-bold">Competition not found</p>
          <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const displayDate = competition.start_date || competition.date;
  const confirmedCount = registrations.filter((r) => r.status === "confirmed").length;
  const pendingCount = registrations.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative">
        {competition.poster_url ? (
          <div className="h-56 md:h-72 overflow-hidden">
            <img src={competition.poster_url} alt={competition.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20" />
        )}

        <div className="max-w-3xl mx-auto px-4 relative -mt-16 z-10">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <Badge className={`mb-2 ${getStatusColor(derivedStatus)}`}>{getStatusLabel(derivedStatus)}</Badge>
                <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{competition.name}</h1>
                {competition.description && (
                  <p className="text-muted-foreground mt-2 max-w-xl">{competition.description}</p>
                )}
              </div>
              <Trophy className="h-10 w-10 text-primary shrink-0" />
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
              {displayDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {new Date(displayDate).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </span>
              )}
              {competition.end_date && competition.start_date && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  to {new Date(competition.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
              {competition.venue && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {competition.venue}
                </span>
              )}
              {competition.host_gym && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {competition.host_gym}
                </span>
              )}
            </div>

            {competition.registration_deadline && (
              <p className="text-xs text-muted-foreground mt-3">
                Registration deadline: {new Date(competition.registration_deadline).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-foreground">{workouts.length}</p>
            <p className="text-xs text-muted-foreground uppercase font-bold">Workouts</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-foreground">{divisions.length}</p>
            <p className="text-xs text-muted-foreground uppercase font-bold">Divisions</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <p className="text-2xl font-black text-foreground">{confirmedCount + pendingCount}</p>
            <p className="text-xs text-muted-foreground uppercase font-bold">Athletes</p>
          </div>
        </div>

        {/* Workouts preview */}
        {workouts.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground uppercase">Workouts</h2>
            </div>
            <div className="space-y-2">
              {workouts.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <span className="font-medium text-foreground text-sm">{w.name || `WOD #${w.workout_number}`}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{w.workout_type}</Badge>
                    <Badge variant="outline" className="text-xs">{w.scoring_type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divisions */}
        {divisions.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground uppercase mb-3">Divisions</h2>
            <div className="flex flex-wrap gap-2">
              {divisions.map((d) => (
                <Badge key={d.id} variant="secondary" className="text-sm">{d.name}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Registration form */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground uppercase mb-4">Register</h2>

          {!user ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-muted-foreground text-sm">You need to be logged in to register.</p>
              <Button onClick={() => navigate("/login")} className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                Sign In to Register
              </Button>
            </div>
          ) : !registrationOpen ? (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                {isDeadlinePassed ? "Registration deadline has passed." : "Registration is not open for this competition."}
              </p>
            </div>
          ) : alreadyRegistered ? (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
              <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">You are already registered for this competition.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Your Name</Label>
                <Input
                  value={athleteName}
                  onChange={(e) => setAthleteName(e.target.value)}
                  placeholder={profile?.display_name || "Enter your name"}
                  className="h-10 bg-background"
                  maxLength={100}
                />
              </div>
              {teams.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">Team (optional)</Label>
                  <Select value={selectedTeamId || "__none__"} onValueChange={(v) => setSelectedTeamId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="Individual / No team" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Individual</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.team_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {competition.age_category_type && competition.age_category_type !== "open" && (
                <p className="text-xs text-muted-foreground">
                  Age requirement: {competition.age_category_type === "under_x" ? `Under ${competition.max_age}` :
                    `${competition.min_age ?? "?"}–${competition.max_age ?? "?"}`}
                </p>
              )}
              <Button
                onClick={handleRegister}
                disabled={registerMutation.isPending}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold h-11"
              >
                {registerMutation.isPending ? "Registering…" : "Register Now"}
              </Button>
            </div>
          )}
        </div>

        {/* Registered athletes */}
        {registrations.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground uppercase mb-3">
              Registered Athletes ({registrations.length})
            </h2>
            <div className="space-y-1.5">
              {registrations.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border">
                  <span className="text-sm font-medium text-foreground">{r.athlete_name}</span>
                  <Badge variant="outline" className={`text-xs ${r.status === "confirmed" ? "text-accent-foreground bg-accent/10" : "text-muted-foreground"}`}>
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
