import { useState } from "react";
import { UserPlus, Trash2, UserCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { athleteNameSchema } from "@/lib/validation";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useTeams, useCompetition } from "@/modules/tournaments/hooks";
import { useParticipants, useAddParticipant, useRemoveParticipant, useSelfRegister } from "@/modules/athletes/hooks";
import { calculateAge, checkAgeEligibility } from "@/utils/calculateAge";

interface ParticipantsPanelProps {
  competitionId: string;
  canAdmin: boolean;
}

export function ParticipantsPanel({ competitionId, canAdmin }: ParticipantsPanelProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: teams = [] } = useTeams(competitionId);
  const { data: participants = [] } = useParticipants(competitionId);
  const { data: competition } = useCompetition(competitionId);
  const addMutation = useAddParticipant();
  const removeMutation = useRemoveParticipant();
  const selfRegMutation = useSelfRegister();

  const [newName, setNewName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);

  const isRegistered = user ? participants.some((p) => p.user_id === user.id) : false;

  const byTeam = teams.reduce<Record<string, { teamName: string; members: typeof participants }>>((acc, t) => {
    acc[t.id] = { teamName: t.team_name, members: participants.filter((p) => p.team_id === t.id) };
    return acc;
  }, {});

  const handleAdd = async () => {
    const parsed = athleteNameSchema.safeParse(newName);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!selectedTeamId) {
      toast.error("Select a team");
      return;
    }
    try {
      await addMutation.mutateAsync({ competitionId, teamId: selectedTeamId, athleteName: newName.trim() });
      setNewName("");
      toast.success("Participant added!");
    } catch {
      toast.error("Failed to add participant");
    }
  };

  const handleSelfRegister = async (teamId: string) => {
    if (!user || !profile?.display_name) return;
    setEligibilityError(null);

    // Age eligibility check
    if (profile.date_of_birth && competition) {
      const dob = new Date(profile.date_of_birth + "T00:00:00");
      const compDate = competition.date ? new Date(competition.date + "T00:00:00") : new Date();
      const err = checkAgeEligibility(
        dob,
        compDate,
        competition.age_category_type,
        competition.min_age,
        competition.max_age,
      );
      if (err) {
        setEligibilityError(err);
        toast.error(err);
        return;
      }
    }

    try {
      await selfRegMutation.mutateAsync({
        competitionId, teamId, userId: user.id, athleteName: profile.display_name,
      });
      toast.success("Registered!");
    } catch {
      toast.error("Failed to register");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeMutation.mutateAsync({ participantId: id, competitionId });
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground uppercase">Roster</h3>
      </div>

      {eligibilityError && (
        <div className="flex items-start gap-3 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{eligibilityError}</p>
        </div>
      )}

      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add teams first.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(byTeam).map(([teamId, { teamName, members }]) => (
            <div key={teamId} className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between p-3 bg-muted/30">
                <span className="text-sm font-bold text-foreground">{teamName}</span>
                {!canAdmin && !isRegistered && (
                  <Button size="sm" variant="outline" onClick={() => handleSelfRegister(teamId)}
                    className="text-xs">
                    <UserCheck className="h-3 w-3 mr-1" /> Join
                  </Button>
                )}
              </div>
              {members.length > 0 ? (
                <div className="divide-y divide-border">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm text-foreground">{m.athlete_name}</span>
                      {canAdmin && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(m.id)} aria-label="Remove participant">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-2 text-xs text-muted-foreground">No members yet</p>
              )}
            </div>
          ))}
        </div>
      )}

      {canAdmin && teams.length > 0 && (
        <div className="flex gap-2 mt-4">
          <Input placeholder="Athlete name" value={newName} onChange={(e) => setNewName(e.target.value)}
            className="bg-background flex-1" maxLength={100} />
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-36 bg-background"><SelectValue placeholder="Team" /></SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.team_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAdd} disabled={!newName.trim() || !selectedTeamId || addMutation.isPending}
            className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
