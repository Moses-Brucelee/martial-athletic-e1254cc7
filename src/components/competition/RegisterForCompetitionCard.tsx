import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { differenceInYears } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Lock, Users, UserPlus, AlertCircle, LogIn, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useDivisions, useTeams, useAddTeam } from "@/modules/tournaments/hooks";
import { useRegistrations, useCreateRegistration } from "@/modules/athletes/hooks";
import { checkDuplicateRegistration } from "@/modules/athletes/api";
import { athleteNameSchema } from "@/lib/validation";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchUserAffiliationStatuses,
  requestAffiliation,
} from "@/data/affiliates";

type AffiliationState = "none" | "pending" | "active";

interface Props {
  competitionId: string;
  competition: any;
  registrationOpen: boolean;
}

/**
 * Reusable in-place registration card.
 *
 * - Reads from the signed-in profile and pre-fills name / DOB so the user is
 *   not asked again for info already on their profile.
 * - Handles affiliate-only competitions: if the competition has a gym_id and
 *   the user is not an active member, surfaces a Request Access button.
 * - Supports individual and team registration with division + teammate slots.
 */
export function RegisterForCompetitionCard({ competitionId, competition, registrationOpen }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useProfile();
  const { data: divisions = [] } = useDivisions(competitionId);
  const { data: teams = [] } = useTeams(competitionId);
  const { data: registrations = [] } = useRegistrations(competitionId);
  const createReg = useCreateRegistration();
  const addTeam = useAddTeam();

  const [affiliation, setAffiliation] = useState<AffiliationState>("none");
  const [affiliationLoading, setAffiliationLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // Form state
  const [mode, setMode] = useState<"individual" | "team">("individual");
  const [divisionId, setDivisionId] = useState<string>("");
  const [teamName, setTeamName] = useState("");
  const [teammates, setTeammates] = useState<string[]>([]);
  // Captured-once profile fallbacks
  const [askedName, setAskedName] = useState("");
  const [askedDob, setAskedDob] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load affiliation status when the competition is affiliate-restricted
  useEffect(() => {
    if (!user || !profile?.id || !competition?.gym_id) return;
    setAffiliationLoading(true);
    fetchUserAffiliationStatuses(profile.id)
      .then((map) => {
        const s = map[competition.gym_id];
        setAffiliation(s === "active" ? "active" : s === "pending" ? "pending" : "none");
      })
      .catch(() => setAffiliation("none"))
      .finally(() => setAffiliationLoading(false));
  }, [user, profile?.id, competition?.gym_id]);

  // Default the division when there is only one
  useEffect(() => {
    if (!divisionId && divisions.length === 1) setDivisionId(divisions[0].id);
  }, [divisions, divisionId]);

  const selectedDivision = useMemo(
    () => divisions.find((d) => d.id === divisionId),
    [divisions, divisionId],
  );
  const teamSize = Number((selectedDivision as any)?.team_size ?? 1);
  // Any division that supports more than one athlete makes team registration possible.
  const anyTeamDivision = divisions.some((d) => Number((d as any).team_size ?? 1) > 1);
  // With divisions configured, the selected division's team size decides the form.
  // Without divisions, the athlete picks individual vs team manually.
  const showModeToggle = divisions.length === 0;
  const requiresTeam = divisions.length === 0 ? mode === "team" : teamSize > 1;
  const teammateSlots = Math.max(0, teamSize - 1);


  // Keep teammates array length in sync with required slots
  useEffect(() => {
    setTeammates((prev) => {
      const next = [...prev];
      next.length = teammateSlots;
      for (let i = 0; i < teammateSlots; i++) if (typeof next[i] !== "string") next[i] = "";
      return next;
    });
  }, [teammateSlots]);

  const alreadyRegistered = useMemo(() => {
    if (!user) return false;
    return registrations.some(
      (r) => r.user_id === user.id && r.status !== "withdrawn" && r.status !== "rejected" && r.status !== "removed",
    );
  }, [registrations, user]);

  const profileName = (profile?.display_name || profile?.full_name || "").trim();
  const needsName = !profileName;
  const dobRequired =
    competition?.age_category_type && competition.age_category_type !== "open";
  const needsDob = dobRequired && !profile?.date_of_birth;

  const checkAge = (dob: string | null | undefined): string | null => {
    if (!competition || !dobRequired) return null;
    if (!dob) return "Date of birth required for this competition.";
    const start = competition.start_date ? new Date(competition.start_date) : new Date();
    const age = differenceInYears(start, new Date(dob));
    if (competition.age_category_type === "under_x" && competition.max_age != null) {
      if (age >= competition.max_age) return `Must be under ${competition.max_age}. Age at competition: ${age}.`;
    }
    if (competition.age_category_type === "age_range") {
      if (competition.min_age != null && age < competition.min_age) return `Must be at least ${competition.min_age}. Age: ${age}.`;
      if (competition.max_age != null && age > competition.max_age) return `Must be ${competition.max_age} or under. Age: ${age}.`;
    }
    return null;
  };

  // ── States ─────────────────────────────────────────────
  if (!registrationOpen) return null;

  if (!user) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <UserPlus className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-foreground">Register for this competition</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in or create a free account to register.
            </p>
          </div>
          <Button
            onClick={() =>
              navigate(`/login?redirectTo=${encodeURIComponent(location.pathname + location.search)}`)
            }
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <LogIn className="h-4 w-4 mr-1" /> Sign in
          </Button>
        </div>
      </Card>
    );
  }

  if (alreadyRegistered) {
    return (
      <Card tone="success">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-foreground">You're registered</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your registration is on the roster below. See you on competition day!
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Affiliate-restricted competition: gate registration on active membership
  if (competition?.gym_id && affiliation !== "active") {
    return (
      <Card tone="warning">
        <div className="flex items-start gap-3">
          <Lock className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-foreground">Affiliate access required</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This competition is open to members of{" "}
              <span className="font-medium text-foreground">{competition.host_gym || "the host gym"}</span>{" "}
              only. {affiliation === "pending"
                ? "Your access request is pending approval."
                : "Request access to register."}
            </p>
          </div>
          {affiliation === "none" && (
            <Button
              disabled={requesting || affiliationLoading}
              onClick={async () => {
                if (!competition.gym_id) return;
                setRequesting(true);
                try {
                  const res = await requestAffiliation(competition.gym_id);
                  setAffiliation(res.status === "active" ? "active" : "pending");
                  toast.success(
                    res.status === "active" ? "Access granted." : "Request sent — the gym manager will review it.",
                  );
                } catch (e: any) {
                  toast.error(e?.message ?? "Could not send request.");
                } finally {
                  setRequesting(false);
                }
              }}
            >
              {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request access"}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // ── Active registration form ──────────────────────────
  const submit = async () => {
    if (!user) return;

    const resolvedName = (profileName || askedName).trim();
    const nameRes = athleteNameSchema.safeParse(resolvedName);
    if (!nameRes.success) {
      toast.error(nameRes.error.issues[0].message);
      return;
    }

    if (divisions.length > 0 && !divisionId) {
      toast.error("Please select a division.");
      return;
    }

    const dob = profile?.date_of_birth || askedDob || null;
    const ageErr = checkAge(dob);
    if (ageErr) {
      toast.error(ageErr);
      return;
    }

    if (requiresTeam) {
      if (teamName.trim().length < 2) {
        toast.error("Team name must be at least 2 characters.");
        return;
      }
      for (let i = 0; i < teammateSlots; i++) {
        if ((teammates[i] || "").trim().length < 2) {
          toast.error("Please name all teammates.");
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const isDup = await checkDuplicateRegistration(competitionId, user.id);
      if (isDup) {
        toast.error("You're already registered for this competition.");
        setSubmitting(false);
        return;
      }

      let teamId: string | null = null;
      if (requiresTeam) {
        const team = await addTeam.mutateAsync({
          competition_id: competitionId,
          team_name: teamName.trim(),
          division_id: divisionId || null,
          captain_user_id: user.id,
        });
        teamId = team.id;
      }

      // Captain / self registration
      await createReg.mutateAsync({
        competition_id: competitionId,
        athlete_name: resolvedName,
        user_id: user.id,
        division_id: divisionId || null,
        team_id: teamId,
        registered_by_user_id: user.id,
        registration_type: requiresTeam ? "team_captain" : "self",
        status: "pending",
      } as any);

      // Teammate placeholder registrations (other-type)
      for (let i = 0; i < teammateSlots; i++) {
        const name = teammates[i].trim();
        if (!name) continue;
        await createReg.mutateAsync({
          competition_id: competitionId,
          athlete_name: name,
          user_id: null,
          division_id: divisionId || null,
          team_id: teamId,
          registered_by_user_id: user.id,
          registration_type: "other",
          status: "pending",
        } as any);
      }

      // Backfill profile from one-time captured fields
      const profileUpdates: Record<string, any> = {};
      if (!profileName && askedName.trim()) {
        profileUpdates.display_name = askedName.trim();
        profileUpdates.full_name = askedName.trim();
      }
      if (!profile?.date_of_birth && askedDob) {
        profileUpdates.date_of_birth = askedDob;
      }
      if (Object.keys(profileUpdates).length > 0) {
        await supabase.from("profiles").update(profileUpdates).eq("user_id", user.id);
        refetchProfile?.();
      }

      toast.success("Registration submitted!");
      setTeamName("");
      setTeammates(Array.from({ length: teammateSlots }, () => ""));
      setAskedName("");
      setAskedDob("");
    } catch (e: any) {
      toast.error(e?.message ?? "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <UserPlus className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-foreground">Register for this competition</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {profileName ? (
                <>Registering as <span className="font-medium text-foreground">{profileName}</span>.</>
              ) : (
                "Add your name and you're in."
              )}
            </p>
          </div>
        </div>

        {/* Mode toggle when teams are possible */}
        {(divisions.length === 0 || teamSize > 0) && (
          <div className="grid grid-cols-2 gap-2">
            <ModeChip active={mode === "individual"} onClick={() => setMode("individual")} icon={<UserPlus className="h-4 w-4" />} label="Individual" />
            <ModeChip active={mode === "team"} onClick={() => setMode("team")} icon={<Users className="h-4 w-4" />} label="Team" />
          </div>
        )}

        {needsName && (
          <div className="space-y-1.5">
            <Label className="text-sm">Your name</Label>
            <Input
              value={askedName}
              onChange={(e) => setAskedName(e.target.value)}
              placeholder="First and last name"
              maxLength={80}
            />
            <p className="text-[10px] text-muted-foreground">Saved to your profile.</p>
          </div>
        )}

        {needsDob && (
          <div className="space-y-1.5">
            <Label className="text-sm">Date of birth</Label>
            <Input
              type="date"
              value={askedDob}
              onChange={(e) => setAskedDob(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">Required to confirm age category. Saved to your profile.</p>
          </div>
        )}

        {divisions.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-sm">Division</Label>
            <Select value={divisionId} onValueChange={setDivisionId}>
              <SelectTrigger><SelectValue placeholder="Select a division" /></SelectTrigger>
              <SelectContent>
                {divisions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                    {(d as any).team_size > 1 ? ` · Team of ${(d as any).team_size}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {requiresTeam && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Team name</Label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Your team name"
                maxLength={60}
              />
            </div>
            {teammateSlots > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm">
                  Teammates ({teammateSlots} {teammateSlots === 1 ? "person" : "people"})
                </Label>
                <div className="space-y-2">
                  {Array.from({ length: teammateSlots }).map((_, i) => (
                    <Input
                      key={i}
                      value={teammates[i] ?? ""}
                      onChange={(e) => {
                        const next = [...teammates];
                        next[i] = e.target.value;
                        setTeammates(next);
                      }}
                      placeholder={`Teammate ${i + 1} name`}
                      maxLength={80}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Teammates are added as pending registrations on your team.
                </p>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={submit}
          disabled={submitting || createReg.isPending || addTeam.isPending}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</>
          ) : (
            "Register now"
          )}
        </Button>
      </div>
    </Card>
  );
}

function Card({ children, tone = "default" as "default" | "success" | "warning" }: { children: React.ReactNode; tone?: "default" | "success" | "warning" }) {
  const toneCls =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "warning"
      ? "border-primary/30 bg-primary/5"
      : "border-border bg-card";
  return (
    <div className={`rounded-xl border p-4 ${toneCls}`}>
      {children}
    </div>
  );
}

function ModeChip({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-semibold transition-colors ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
