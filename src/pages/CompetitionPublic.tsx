import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useCompetition, useTeams, useDivisions, useWorkouts, useAddTeam } from "@/modules/tournaments/hooks";
import { useRegistrations, useCreateRegistration } from "@/modules/athletes/hooks";
import { checkDuplicateRegistration } from "@/modules/athletes/api";
import { deriveStatus, getStatusLabel, getStatusColor } from "@/modules/tournaments/stateMachine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Clock, Users, Dumbbell, AlertCircle, CheckCircle2, Trophy, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { differenceInYears } from "date-fns";
import { athleteNameSchema, emailSchema } from "@/lib/validation";
import { STATUS_LABELS, STATUS_COLORS } from "@/modules/athletes/types";
import { AdaptivePoster } from "@/components/competition/AdaptivePoster";

export default function CompetitionPublic() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: competition, isLoading, error } = useCompetition(id);
  const { data: teams = [] } = useTeams(id);
  const { data: divisions = [] } = useDivisions(id);
  const { data: workouts = [] } = useWorkouts(id);
  const { data: registrations = [] } = useRegistrations(id);
  const createReg = useCreateRegistration();
  const addTeamMutation = useAddTeam();

  // Registration wizard state
  const [regStep, setRegStep] = useState(0);
  const [regMode, setRegMode] = useState<"individual" | "team">("individual");
  const [regType, setRegType] = useState<"self" | "other">("self");
  const [athleteName, setAthleteName] = useState("");
  const [athleteEmail, setAthleteEmail] = useState("");
  const [athletePhone, setAthletePhone] = useState("");
  const [athleteGender, setAthleteGender] = useState("");
  const [athleteDob, setAthleteDob] = useState("");
  const [selectedDivisionId, setSelectedDivisionId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [showRegWizard, setShowRegWizard] = useState(false);
  // Team registration state
  const [teamName, setTeamName] = useState("");
  const [teamMembers, setTeamMembers] = useState<{ name: string; email: string }[]>([{ name: "", email: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const derivedStatus = competition ? deriveStatus(competition) : "draft";
  const canRegister = derivedStatus === "published" || derivedStatus === "live";
  const isDeadlinePassed = competition?.registration_deadline
    ? new Date() > new Date(competition.registration_deadline)
    : false;
  const registrationOpen = canRegister && !isDeadlinePassed;

  const alreadyRegistered = user
    ? registrations.some((r) => r.user_id === user.id && r.status !== "withdrawn" && r.status !== "rejected")
    : false;

  const checkAgeEligibility = (): string | null => {
    if (!competition || competition.age_category_type === "open" || !competition.age_category_type) return null;
    const dob = regType === "self" ? profile?.date_of_birth : athleteDob;
    if (!dob) return regType === "self" ? "Your profile is missing a date of birth." : null;

    const startDate = competition.start_date ? new Date(competition.start_date) : new Date();
    const age = differenceInYears(startDate, new Date(dob));

    if (competition.age_category_type === "under_x" && competition.max_age != null) {
      if (age >= competition.max_age) return `Must be under ${competition.max_age}. Age at competition: ${age}.`;
    }
    if (competition.age_category_type === "age_range") {
      if (competition.min_age != null && age < competition.min_age) return `Must be at least ${competition.min_age}. Age: ${age}.`;
      if (competition.max_age != null && age > competition.max_age) return `Must be ${competition.max_age} or under. Age: ${age}.`;
    }
    return null;
  };

  const resolvedName = regType === "self"
    ? (profile?.display_name || profile?.full_name || "Athlete")
    : athleteName.trim();

  const handleSubmit = async () => {
    if (!user || !id) return;

    // Validate
    const nameResult = athleteNameSchema.safeParse(resolvedName);
    if (!nameResult.success) {
      toast.error(nameResult.error.issues[0].message);
      return;
    }

    if (regType === "other" && athleteEmail) {
      const emailResult = emailSchema.safeParse(athleteEmail);
      if (!emailResult.success) {
        toast.error(emailResult.error.issues[0].message);
        return;
      }
    }

    const ageError = checkAgeEligibility();
    if (ageError) {
      toast.error(ageError);
      return;
    }

    // Duplicate check
    if (regType === "self") {
      const isDup = await checkDuplicateRegistration(id, user.id);
      if (isDup) {
        toast.error("You are already registered for this competition.");
        return;
      }
    }

    try {
      await createReg.mutateAsync({
        competition_id: id,
        athlete_name: resolvedName,
        user_id: regType === "self" ? user.id : null,
        division_id: selectedDivisionId || null,
        team_id: selectedTeamId || null,
        registered_by_user_id: user.id,
        registration_type: regType,
        email: regType === "self" ? null : (athleteEmail || null),
        phone: regType === "self" ? null : (athletePhone || null),
        gender: regType === "self" ? null : (athleteGender || null),
        date_of_birth: regType === "self" ? null : (athleteDob || null),
        status: "pending",
      });
      toast.success("Registration submitted!");
      setShowRegWizard(false);
      setRegStep(0);
      setAthleteEmail("");
      setAthleteName("");
      setAthletePhone("");
      setSelectedDivisionId("");
      setSelectedTeamId("");
    } catch (err) {
      toast.error("Registration failed. Please try again.");
    }
  };

  // Team the current user already captains in this competition
  const myCaptainTeam = user ? teams.find((t) => t.captain_user_id === user.id) : null;

  const handleSubmitTeam = async () => {
    if (!user || !id) return;
    const validMembers = teamMembers.filter((m) => m.name.trim().length >= 2);
    if (validMembers.length === 0) { toast.error("Add at least one team member"); return; }
    for (const m of validMembers) {
      if (m.email) {
        const e = emailSchema.safeParse(m.email);
        if (!e.success) { toast.error(`Invalid email for ${m.name}`); return; }
      }
    }

    setSubmitting(true);
    try {
      let teamId: string;
      let teamDivisionId: string | null = selectedDivisionId || null;
      let teamLabel: string;
      let isNewTeam = false;

      if (myCaptainTeam) {
        teamId = myCaptainTeam.id;
        teamDivisionId = myCaptainTeam.division_id ?? null;
        teamLabel = myCaptainTeam.team_name;
      } else {
        const tName = teamName.trim();
        if (tName.length < 2) { toast.error("Team name is required"); setSubmitting(false); return; }
        const div = divisions.find((d) => d.id === selectedDivisionId);
        const team = await addTeamMutation.mutateAsync({
          competition_id: id,
          team_name: tName,
          division: div?.name || null,
          division_id: selectedDivisionId || null,
          captain_user_id: user.id,
        } as any);
        teamId = team.id;
        teamLabel = tName;
        isNewTeam = true;

        const captainAlreadyRegistered = registrations.some(
          (r) => r.user_id === user.id && r.status !== "withdrawn" && r.status !== "rejected",
        );
        if (!captainAlreadyRegistered) {
          const captainName = profile?.display_name || profile?.full_name || "Captain";
          await createReg.mutateAsync({
            competition_id: id,
            athlete_name: captainName,
            user_id: user.id,
            team_id: teamId,
            division_id: teamDivisionId,
            registered_by_user_id: user.id,
            registration_type: "team_captain",
            status: "pending",
          });
        }
      }

      // Skip duplicates already on the team (by name, case-insensitive)
      const existingNames = new Set(
        registrations
          .filter((r) => r.team_id === teamId && r.status !== "withdrawn" && r.status !== "rejected" && r.status !== "removed")
          .map((r) => r.athlete_name.trim().toLowerCase()),
      );
      let added = 0;
      let skipped = 0;
      for (const m of validMembers) {
        const key = m.name.trim().toLowerCase();
        if (existingNames.has(key)) { skipped++; continue; }
        existingNames.add(key);
        await createReg.mutateAsync({
          competition_id: id,
          athlete_name: m.name.trim(),
          team_id: teamId,
          division_id: teamDivisionId,
          registered_by_user_id: user.id,
          registration_type: "team_member",
          email: m.email.trim() || null,
          status: "pending",
        });
        added++;
      }

      if (isNewTeam) {
        toast.success(`Team "${teamLabel}" registered with ${added} member(s)!`);
      } else {
        toast.success(
          added > 0
            ? `Added ${added} member(s) to ${teamLabel}${skipped ? ` (${skipped} duplicate skipped)` : ""}`
            : `No new members added — all were duplicates of ${teamLabel}.`,
        );
      }

      setShowRegWizard(false);
      setRegStep(0);
      setTeamName("");
      setTeamMembers([{ name: "", email: "" }]);
      setSelectedDivisionId("");
    } catch {
      toast.error("Team registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
  const confirmedCount = registrations.filter((r) => r.status === "approved" || r.status === "confirmed").length;
  const totalCount = registrations.filter((r) => r.status !== "rejected" && r.status !== "removed" && r.status !== "withdrawn").length;

  // Wizard steps
  const renderWizardStep = () => {
    if (regMode === "team") {
      // Team registration single-step form
      return (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-foreground">
            {myCaptainTeam ? `Add Members to "${myCaptainTeam.team_name}"` : "Team Registration"}
          </h3>
          {myCaptainTeam ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
              You're the captain of <span className="font-semibold">{myCaptainTeam.team_name}</span>
              {myCaptainTeam.division ? <> · <span className="text-muted-foreground">{myCaptainTeam.division}</span></> : null}.
              New members below will be added to this team — duplicates are skipped automatically.
            </div>
          ) : (
            <>
              <div>
                <Label className="text-sm font-medium">Team Name *</Label>
                <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Iron Wolves" className="mt-1" maxLength={100} />
              </div>
              {divisions.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Division</Label>
                  <Select value={selectedDivisionId || "__none__"} onValueChange={(v) => setSelectedDivisionId(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No division</SelectItem>
                      {divisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <p className="text-xs text-muted-foreground">You ({profile?.display_name || "Captain"}) will be added as captain.</p>
            </>
          )}
          <div>
            <Label className="text-sm font-medium">{myCaptainTeam ? "New Members" : "Team Members"}</Label>
            <div className="space-y-2 mt-1">
              {teamMembers.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={m.name} onChange={(e) => {
                    const next = [...teamMembers]; next[i] = { ...next[i], name: e.target.value }; setTeamMembers(next);
                  }} placeholder="Member name" className="flex-1" maxLength={100} />
                  <Input value={m.email} onChange={(e) => {
                    const next = [...teamMembers]; next[i] = { ...next[i], email: e.target.value }; setTeamMembers(next);
                  }} placeholder="email (optional)" type="email" className="flex-1" maxLength={255} />
                  {teamMembers.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => setTeamMembers(teamMembers.filter((_, idx) => idx !== i))}>×</Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setTeamMembers([...teamMembers, { name: "", email: "" }])} className="w-full">
                + Add Member
              </Button>
            </div>
          </div>
        </div>
      );
    }
    switch (regStep) {
      case 0:
        return (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-foreground">Register as:</h3>
            <RadioGroup value={regType} onValueChange={(v) => setRegType(v as "self" | "other")} className="space-y-3">
              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${regType === "self" ? "border-primary bg-primary/5" : "border-border bg-background hover:border-muted-foreground/30"}`}>
                <RadioGroupItem value="self" />
                <div>
                  <p className="font-semibold text-foreground">Myself</p>
                  <p className="text-xs text-muted-foreground">Register using your profile info</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${regType === "other" ? "border-primary bg-primary/5" : "border-border bg-background hover:border-muted-foreground/30"}`}>
                <RadioGroupItem value="other" />
                <div>
                  <p className="font-semibold text-foreground">Someone Else</p>
                  <p className="text-xs text-muted-foreground">Register another athlete</p>
                </div>
              </label>
            </RadioGroup>
            {regType === "other" && (
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-sm font-medium">Athlete Name *</Label>
                  <Input value={athleteName} onChange={(e) => setAthleteName(e.target.value)} placeholder="Full name" className="mt-1" maxLength={100} />
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <Input value={athleteEmail} onChange={(e) => setAthleteEmail(e.target.value)} placeholder="athlete@email.com" type="email" className="mt-1" maxLength={255} />
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <Input value={athletePhone} onChange={(e) => setAthletePhone(e.target.value)} placeholder="+1 234 567 890" className="mt-1" maxLength={20} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium">Gender</Label>
                    <Select value={athleteGender} onValueChange={setAthleteGender}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Date of Birth</Label>
                    <Input type="date" value={athleteDob} onChange={(e) => setAthleteDob(e.target.value)} className="mt-1" />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-foreground">Select Division</h3>
            {divisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No divisions available. You can proceed without one.</p>
            ) : (
              <RadioGroup value={selectedDivisionId} onValueChange={setSelectedDivisionId} className="space-y-2">
                {divisions.map((d) => (
                  <label key={d.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedDivisionId === d.id ? "border-primary bg-primary/5" : "border-border bg-background hover:border-muted-foreground/30"}`}>
                    <RadioGroupItem value={d.id} />
                    <span className="font-medium text-foreground">{d.name}</span>
                  </label>
                ))}
              </RadioGroup>
            )}
            {teams.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Team (optional)</Label>
                <Select value={selectedTeamId || "__none__"} onValueChange={(v) => setSelectedTeamId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Individual" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Individual</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.team_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-foreground">Confirm Registration</h3>
            <div className="rounded-xl border border-border bg-background p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Athlete</span>
                <span className="font-medium text-foreground">{resolvedName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Registration Type</span>
                <span className="font-medium text-foreground">{regType === "self" ? "Self" : "On behalf"}</span>
              </div>
              {selectedDivisionId && divisions.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Division</span>
                  <span className="font-medium text-foreground">{divisions.find((d) => d.id === selectedDivisionId)?.name}</span>
                </div>
              )}
              {selectedTeamId && teams.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Team</span>
                  <span className="font-medium text-foreground">{teams.find((t) => t.id === selectedTeamId)?.team_name}</span>
                </div>
              )}
              {regType === "other" && athleteEmail && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-foreground">{athleteEmail}</span>
                </div>
              )}
              {competition.age_category_type && competition.age_category_type !== "open" && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Age Requirement</span>
                  <span className="font-medium text-foreground">
                    {competition.age_category_type === "under_x" ? `Under ${competition.max_age}` : `${competition.min_age ?? "?"}–${competition.max_age ?? "?"}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const canProceedStep0 = regType === "self" || athleteName.trim().length >= 2;
  const canProceedStep1 = true; // division is optional
  const totalSteps = 3;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative">
        {competition.poster_url ? (
          <div className="h-56 md:h-72 overflow-hidden relative">
            <AdaptivePoster src={competition.poster_url} alt={competition.name} className="h-56 md:h-72" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-20" />
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
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{competition.venue}</span>
              )}
              {competition.host_gym && (
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{competition.host_gym}</span>
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
            <p className="text-2xl font-black text-foreground">{totalCount}</p>
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

        {/* Owner shortcut */}
        {user && competition.created_by === user.id && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">You own this competition</p>
              <p className="text-xs text-muted-foreground">
                {registrations.filter((r) => r.status === "pending").length} pending registration(s)
              </p>
            </div>
            <Button onClick={() => navigate(`/competition/${id}`)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              Manage
            </Button>
          </div>
        )}

        {/* Registration */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-foreground uppercase mb-4">Register</h2>

          {!user ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-muted-foreground text-sm">Sign in to register for this competition.</p>
              <Button onClick={() => navigate("/login")} className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                Sign In to Register
              </Button>
            </div>
          ) : !registrationOpen ? (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                {isDeadlinePassed ? "Registration deadline has passed." : "Registration is not open."}
              </p>
            </div>
          ) : alreadyRegistered && !showRegWizard ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">You are registered for this competition.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setRegType("other"); setShowRegWizard(true); setRegStep(0); }}>
                Register another athlete
              </Button>
            </div>
          ) : !showRegWizard ? (
            <Button onClick={() => setShowRegWizard(true)} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold h-12 text-base">
              Register Now
            </Button>
          ) : (
            <div className="space-y-4">
              {/* Mode tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => { setRegMode("individual"); setRegStep(0); }}
                  className={`py-2 text-sm font-semibold rounded-md transition-colors ${regMode === "individual" ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}
                >Individual</button>
                <button
                  type="button"
                  onClick={() => { setRegMode("team"); setRegStep(0); }}
                  className={`py-2 text-sm font-semibold rounded-md transition-colors ${regMode === "team" ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}
                >Team</button>
              </div>

              {/* Step indicator (individual only) */}
              {regMode === "individual" && (
                <div className="flex items-center gap-2 mb-2">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        i < regStep ? "bg-primary text-primary-foreground" :
                        i === regStep ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-card" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {i < regStep ? "✓" : i + 1}
                      </div>
                      {i < totalSteps - 1 && (
                        <div className={`h-0.5 w-8 ${i < regStep ? "bg-primary" : "bg-border"}`} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {renderWizardStep()}

              {/* Navigation */}
              <div className="flex gap-3 pt-2">
                {regMode === "individual" && regStep > 0 ? (
                  <Button variant="outline" onClick={() => setRegStep((s) => s - 1)} className="flex-1 h-11">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setShowRegWizard(false)} className="flex-1 h-11">
                    Cancel
                  </Button>
                )}
                {regMode === "team" ? (
                  <Button
                    onClick={handleSubmitTeam}
                    disabled={submitting}
                    className="flex-1 h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                  >
                    {submitting ? "Submitting…" : "Register Team"}
                  </Button>
                ) : regStep < totalSteps - 1 ? (
                  <Button
                    onClick={() => setRegStep((s) => s + 1)}
                    disabled={regStep === 0 && !canProceedStep0}
                    className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={createReg.isPending}
                    className="flex-1 h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                  >
                    {createReg.isPending ? "Submitting…" : "Submit Registration"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Teams */}
        {teams.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground uppercase mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Teams ({teams.length})
            </h2>
            <div className="space-y-2">
              {teams.map((t) => {
                const members = registrations.filter(
                  (r) => r.team_id === t.id && r.status !== "removed" && r.status !== "withdrawn" && r.status !== "rejected"
                );
                const isOpen = expandedTeamId === t.id;
                return (
                  <div key={t.id} className="rounded-lg border border-border overflow-hidden bg-background">
                    <button
                      type="button"
                      onClick={() => setExpandedTeamId(isOpen ? null : t.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        <span className="font-semibold text-foreground text-sm truncate">{t.team_name}</span>
                        {t.division && (
                          <Badge variant="outline" className="text-xs shrink-0">{t.division}</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{members.length} member{members.length === 1 ? "" : "s"}</span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-border">
                        {members.length === 0 ? (
                          <p className="text-xs text-muted-foreground px-3 py-2">No members yet</p>
                        ) : (
                          members.map((m) => (
                            <div key={m.id} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-b-0">
                              <span className="text-sm text-foreground">
                                {m.athlete_name}
                                {m.registration_type === "team_captain" && (
                                  <span className="ml-2 text-[10px] uppercase font-bold text-primary">Captain</span>
                                )}
                              </span>
                              <Badge variant="outline" className={`text-xs ${STATUS_COLORS[m.status] ?? ""}`}>
                                {STATUS_LABELS[m.status] ?? m.status}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Registered athletes */}
        {registrations.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground uppercase mb-3">
              Registered Athletes ({totalCount})
            </h2>
            <div className="space-y-1.5">
              {registrations
                .filter((r) => r.status !== "removed" && r.status !== "withdrawn")
                .map((r) => (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">{r.athlete_name}</span>
                    {r.division_id && divisions.length > 0 && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {divisions.find((d) => d.id === r.division_id)?.name}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLORS[r.status] ?? ""}`}>
                    {STATUS_LABELS[r.status] ?? r.status}
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
