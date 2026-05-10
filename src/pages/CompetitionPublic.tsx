import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useCompetition, useTeams, useDivisions, useWorkouts, useWorkoutMovements, useAddTeam } from "@/modules/tournaments/hooks";
import { useRegistrations, useCreateRegistration, useDeleteRegistration } from "@/modules/athletes/hooks";
import { checkDuplicateRegistration } from "@/modules/athletes/api";
import { deriveStatus, getStatusLabel, getStatusColor } from "@/modules/tournaments/stateMachine";
import { EditRegistrationDialog } from "@/modules/athletes/components/EditRegistrationDialog";
import type { AthleteRegistration } from "@/domain/competition";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, MapPin, Clock, Users, Dumbbell, AlertCircle, CheckCircle2, Trophy, ChevronRight, ChevronLeft, Eye, Lock } from "lucide-react";
import { toast } from "sonner";
import { differenceInYears } from "date-fns";
import { athleteNameSchema, emailSchema } from "@/lib/validation";
import { STATUS_LABELS, STATUS_COLORS } from "@/modules/athletes/types";
import { AdaptivePoster } from "@/components/competition/AdaptivePoster";
import { formatTimeMMSS } from "@/utils/format";
import { listSponsors, type SponsorAsset } from "@/lib/posterAssets";
import { useEffect } from "react";

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
  const [revealedWorkoutId, setRevealedWorkoutId] = useState<string | null>(null);
  const [teammateNames, setTeammateNames] = useState<string[]>([]);

  const selectedDivision = useMemo(
    () => divisions.find((d) => d.id === selectedDivisionId),
    [divisions, selectedDivisionId]
  );
  const teamSize = (selectedDivision as any)?.team_size ?? 1;
  const requiresTeammates = teamSize > 1;
  const additionalTeammateSlots = Math.max(0, teamSize - 1);
  const teammateNamesValid = !requiresTeammates ||
    Array.from({ length: additionalTeammateSlots }).every((_, i) => (teammateNames[i] || "").trim().length >= 2);

  // Team registration state
  const [teamName, setTeamName] = useState("");
  const [teamMembers, setTeamMembers] = useState<{ name: string; email: string }[]>([{ name: "", email: "" }]);
  // Whether the signed-in user (the captain creating the team) is also competing.
  // Defaults to true — they're shown as the first roster entry and can remove themselves.
  const [includeCaptain, setIncludeCaptain] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [editingReg, setEditingReg] = useState<AthleteRegistration | null>(null);
  const [removingReg, setRemovingReg] = useState<AthleteRegistration | null>(null);
  const deleteReg = useDeleteRegistration();
  const [sponsors, setSponsors] = useState<SponsorAsset[]>([]);
  useEffect(() => {
    if (!id) return;
    listSponsors(id).then(setSponsors).catch(() => {});
  }, [id]);

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

  // Team the current user already belongs to (as captain or member) in this competition
  const myCaptainTeam = (() => {
    if (!user) return null;
    const captained = teams.find((t) => t.captain_user_id === user.id);
    if (captained) return captained;
    // Fallback: find via existing registration (covers legacy teams missing captain_user_id)
    const myReg = registrations.find(
      (r) => r.user_id === user.id && r.team_id && !["withdrawn", "rejected", "removed"].includes(r.status),
    );
    if (myReg?.team_id) return teams.find((t) => t.id === myReg.team_id) ?? null;
    return null;
  })();

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
        const nameTaken = teams.some((t) => t.team_name.trim().toLowerCase() === tName.toLowerCase());
        if (nameTaken) {
          toast.error(`Team name "${tName}" is already taken. Please choose another.`);
          setSubmitting(false);
          return;
        }
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
        if (includeCaptain && !captainAlreadyRegistered) {
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

      // De-dup by name + email (case-insensitive) within this competition's team
      const teamRegs = registrations.filter(
        (r) => r.team_id === teamId && !["withdrawn", "rejected", "removed"].includes(r.status),
      );
      const existingNames = new Set(teamRegs.map((r) => r.athlete_name.trim().toLowerCase()));
      const existingEmails = new Set(
        teamRegs.map((r) => (r.email || "").trim().toLowerCase()).filter(Boolean),
      );
      // Also block re-adding the captain themselves as a member by email
      if (user.email) existingEmails.add(user.email.trim().toLowerCase());

      // Catch in-form duplicates too
      const formNames = new Set<string>();
      const formEmails = new Set<string>();
      let added = 0;
      let skipped = 0;
      for (const m of validMembers) {
        const nameKey = m.name.trim().toLowerCase();
        const emailKey = m.email.trim().toLowerCase();
        if (existingNames.has(nameKey) || formNames.has(nameKey)) { skipped++; continue; }
        if (emailKey && (existingEmails.has(emailKey) || formEmails.has(emailKey))) { skipped++; continue; }
        formNames.add(nameKey);
        if (emailKey) formEmails.add(emailKey);
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
    } catch (err: any) {
      if (err?.message === "TEAM_NAME_TAKEN") {
        toast.error("Team name is already taken in this competition. Please choose another.");
      } else {
        toast.error("Team registration failed. Please try again.");
      }
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
    // Distinguish: explicit fetch error vs. row-not-visible (RLS-filtered or truly missing)
    const isAuthRequired = !user && !competition && !error;
    const title = error
      ? "Unable to load competition"
      : isAuthRequired
        ? "Sign in to view this competition"
        : "Competition not found";
    const detail = error
      ? "Something went wrong reaching the server. Please try again in a moment."
      : isAuthRequired
        ? "This competition may be a draft or restricted. Sign in to see if you have access."
        : "This event doesn't exist, has been removed, or isn't published yet.";
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-foreground font-bold text-lg">{title}</p>
          <p className="text-sm text-muted-foreground">{detail}</p>
          <div className="flex gap-2 justify-center">
            {isAuthRequired && (
              <Button onClick={() => navigate(`/login?redirect=/event/${id}`)}>Sign In</Button>
            )}
            <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (competition.status === "draft" && competition.created_by !== user?.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-foreground font-bold text-lg">Not yet published</p>
          <p className="text-sm text-muted-foreground">This competition is still a draft. Check back once the organizer publishes it.</p>
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
                {divisions.map((d) => {
                  const ts = (d as any).team_size ?? 1;
                  return (
                    <label key={d.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedDivisionId === d.id ? "border-primary bg-primary/5" : "border-border bg-background hover:border-muted-foreground/30"}`}>
                      <RadioGroupItem value={d.id} />
                      <span className="font-medium text-foreground flex-1">{d.name}</span>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Users className="h-3 w-3" />
                        {ts === 1 ? "Solo" : `${ts} per team`}
                      </Badge>
                    </label>
                  );
                })}
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

            {requiresTeammates && (
              <div className="space-y-2 pt-2">
                <Label className="text-sm font-medium">
                  Teammate names ({additionalTeammateSlots} additional)
                </Label>
                <p className="text-xs text-muted-foreground">
                  This division requires {teamSize} athletes per team. You count as one — please add the other {additionalTeammateSlots}.
                </p>
                {Array.from({ length: additionalTeammateSlots }).map((_, i) => (
                  <Input
                    key={i}
                    value={teammateNames[i] || ""}
                    onChange={(e) => {
                      const next = [...teammateNames];
                      next[i] = e.target.value;
                      setTeammateNames(next);
                    }}
                    placeholder={`Teammate ${i + 2} full name`}
                    maxLength={100}
                  />
                ))}
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
  const canProceedStep1 = teammateNamesValid;
  const totalSteps = 3;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative pb-20 sm:pb-24">
        {competition.poster_url ? (
          <div className="relative w-full bg-muted">
            <AdaptivePoster src={competition.poster_url} alt={competition.name} className="w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-20 pointer-events-none" />
          </div>
        ) : (
          <div className="h-32 sm:h-40 bg-gradient-to-br from-primary/20 to-accent/20" />
        )}

        <div className="max-w-3xl mx-auto px-4 relative mt-4 z-10">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <Badge className={`mb-2 ${getStatusColor(derivedStatus)}`}>{getStatusLabel(derivedStatus)}</Badge>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight break-words">{competition.name}</h1>
                {competition.description && (
                  <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-xl">{competition.description}</p>
                )}
              </div>
              <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-primary shrink-0" />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-xs sm:text-sm text-muted-foreground">
              {displayDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 shrink-0" />
                  {new Date(displayDate).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                </span>
              )}
              {competition.end_date && competition.start_date && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 shrink-0" />
                  to {new Date(competition.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
              {competition.venue && (
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0" />{competition.venue}</span>
              )}
              {competition.host_gym && (
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4 shrink-0" />{competition.host_gym}</span>
              )}
            </div>

            {competition.registration_deadline && (
              <p className="text-xs text-muted-foreground mt-3">
                Registration deadline: {new Date(competition.registration_deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}

            {registrationOpen && !alreadyRegistered && (
              <Button
                onClick={() => {
                  if (!user) { navigate(`/login?redirect=/event/${id}`); return; }
                  setShowRegWizard(true);
                  document.getElementById("register-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="mt-4 w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
              >
                Sign Up Now
              </Button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 pb-8 space-y-6 sm:space-y-8">
        {/* Sponsor logos — strip on mobile, grid on desktop */}
        {sponsors.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold mb-3 text-center">
              Proudly Sponsored By
            </p>
            <div className="flex sm:hidden gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
              {sponsors.map((s) => (
                <div key={s.path} className="shrink-0 h-24 w-32 rounded-md bg-background/50 border border-border/50 flex items-center justify-center snap-start p-2">
                  <img src={s.url} alt="sponsor" className="max-h-full max-w-full object-contain" />
                </div>
              ))}
            </div>
            <div className="hidden sm:grid grid-cols-3 md:grid-cols-6 gap-3">
              {sponsors.map((s) => (
                <div key={s.path} className="aspect-square rounded-lg bg-background/50 border border-border/50 flex items-center justify-center p-2">
                  <img src={s.url} alt="sponsor" className="max-h-full max-w-full object-contain" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-black text-foreground">{workouts.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold">Workouts</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-black text-foreground">{divisions.length}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold">Divisions</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-black text-foreground">{totalCount}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold">Athletes</p>
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
              {workouts.map((w) => {
                const isHidden = w.visibility === "hidden" ||
                  (w.visibility === "scheduled" && w.scheduled_reveal_at && new Date(w.scheduled_reveal_at) > new Date());
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => !isHidden && setRevealedWorkoutId(w.id)}
                    disabled={isHidden}
                    className={`w-full flex items-center justify-between p-3 rounded-lg bg-background border border-border text-left transition-all ${
                      isHidden ? "opacity-60 cursor-not-allowed" : "hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                    }`}
                  >
                    <span className="font-medium text-foreground text-sm flex items-center gap-2">
                      {isHidden ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-primary" />}
                      {w.name || `WOD #${w.workout_number}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{w.workout_type}</Badge>
                      <Badge variant="outline" className="text-xs">{w.scoring_type}</Badge>
                      {!isHidden && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">Tap a workout to view full details.</p>
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
        <div id="register-section" className="bg-card border border-border rounded-xl p-6 scroll-mt-20">
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
                    {submitting ? "Submitting…" : myCaptainTeam ? "Add Members" : "Register Team"}
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
                          members.map((m) => {
                            const canManage = !!user && (
                              t.captain_user_id === user.id ||
                              competition.created_by === user.id
                            );
                            return (
                              <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border last:border-b-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  {canManage ? (
                                    <button
                                      type="button"
                                      onClick={() => setEditingReg(m)}
                                      className="text-sm font-medium text-primary underline-offset-2 hover:underline truncate"
                                    >
                                      {m.athlete_name}
                                    </button>
                                  ) : (
                                    <span className="text-sm text-foreground truncate">{m.athlete_name}</span>
                                  )}
                                  {m.registration_type === "team_captain" && (
                                    <span className="text-[10px] uppercase font-bold text-primary shrink-0">Captain</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge variant="outline" className={`text-xs ${STATUS_COLORS[m.status] ?? ""}`}>
                                    {STATUS_LABELS[m.status] ?? m.status}
                                  </Badge>
                                  {canManage && (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingReg(m)} aria-label="Edit">
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      {m.registration_type !== "team_captain" && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setRemovingReg(m)} aria-label="Remove">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })
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

      <WorkoutRevealDialog
        workoutId={revealedWorkoutId}
        workouts={workouts}
        onClose={() => setRevealedWorkoutId(null)}
      />

      <EditRegistrationDialog
        open={!!editingReg}
        onOpenChange={(o) => !o && setEditingReg(null)}
        reg={editingReg}
        competitionId={id!}
      />

      <AlertDialog open={!!removingReg} onOpenChange={(o) => !o && setRemovingReg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              {removingReg ? `This will remove ${removingReg.athlete_name} from the team.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!removingReg || !id) return;
                try {
                  await deleteReg.mutateAsync({ id: removingReg.id, competitionId: id });
                  toast.success("Member removed");
                } catch {
                  toast.error("Failed to remove member");
                } finally {
                  setRemovingReg(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WorkoutRevealDialog({
  workoutId,
  workouts,
  onClose,
}: {
  workoutId: string | null;
  workouts: any[];
  onClose: () => void;
}) {
  const workout = workouts.find((w) => w.id === workoutId);
  const { data: movements = [] } = useWorkoutMovements(workoutId ?? undefined);
  const open = !!workoutId && !!workout;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            {workout?.name || `WOD #${workout?.workout_number}`}
          </DialogTitle>
        </DialogHeader>
        {workout && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{workout.workout_type}</Badge>
              <Badge variant="outline">Scoring: {workout.scoring_type}</Badge>
              {workout.time_cap_seconds != null && (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  Cap: {formatTimeMMSS(workout.time_cap_seconds)}
                </Badge>
              )}
            </div>
            {workout.description && (
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1">Description</h4>
                <p className="text-sm text-foreground whitespace-pre-wrap">{workout.description}</p>
              </div>
            )}
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase mb-2">Movements</h4>
              {movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No movements specified.</p>
              ) : (
                <ol className="space-y-1.5 list-decimal list-inside">
                  {movements.map((m: any) => (
                    <li key={m.id} className="text-sm text-foreground">
                      <span className="font-medium">{m.movement_name}</span>
                      {m.reps != null && <span className="text-muted-foreground"> · {m.reps} reps</span>}
                      {m.weight != null && <span className="text-muted-foreground"> · {m.weight}{m.unit || ""}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
