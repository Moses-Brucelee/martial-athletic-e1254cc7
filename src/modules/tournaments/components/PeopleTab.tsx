import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, Check, Users, UserPlus, Gavel, Flame, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { RegistrationManager } from "@/modules/athletes/components/RegistrationManager";
import { TeamsPanel } from "@/modules/tournaments/components/TeamsPanel";
import { HeatManagementPanel } from "@/modules/tournaments/components/HeatManagementPanel";
import { JudgesPanel as OriginalJudgesPanel } from "@/components/competition/JudgesPanel";
import { useJudges } from "@/modules/admin/hooks";
import { useRegistrations } from "@/modules/athletes/hooks";
import { useTeams } from "@/modules/tournaments/hooks";
import { useHeats } from "@/modules/tournaments/hooks-engine";
import type { CompetitionStatus } from "@/modules/tournaments/stateMachine";

interface PeopleTabProps {
  competitionId: string;
  canAdmin: boolean;
  derivedStatus: CompetitionStatus;
}

function ShareableLink({ competitionId }: { competitionId: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/event/${competitionId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Registration link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
      <Link2 className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground mb-0.5">Share Registration Link</p>
        <code className="text-[11px] text-muted-foreground block truncate">{link}</code>
      </div>
      <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0 h-8 px-3">
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        <span className="ml-1.5 text-xs">{copied ? "Copied" : "Copy"}</span>
      </Button>
    </div>
  );
}

function JudgesPanelWrapper({ competitionId, canAdmin }: { competitionId: string; canAdmin: boolean }) {
  const { data: judges = [] } = useJudges(competitionId);
  const [localJudges, setLocalJudges] = useState(judges);

  if (JSON.stringify(localJudges) !== JSON.stringify(judges) && judges.length > 0) {
    setLocalJudges(judges);
  }

  return (
    <OriginalJudgesPanel
      competitionId={competitionId}
      judges={localJudges}
      setJudges={setLocalJudges}
      canAdmin={canAdmin}
    />
  );
}

export function PeopleTab({ competitionId, canAdmin, derivedStatus }: PeopleTabProps) {
  const { data: registrations = [] } = useRegistrations(competitionId);
  const { data: teams = [] } = useTeams(competitionId);
  const { data: heats = [] } = useHeats(competitionId);

  const approvedCount = registrations.filter(
    (r) => r.status === "approved" || r.status === "confirmed"
  ).length;
  const pendingCount = registrations.filter((r) => r.status === "pending").length;

  const showShareLink = derivedStatus === "published" || derivedStatus === "live";

  return (
    <div className="space-y-4">
      {/* Share link */}
      {showShareLink && <ShareableLink competitionId={competitionId} />}

      {/* Quick stats bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs">
          <ClipboardList className="h-3 w-3" />
          {registrations.length} Registrations
        </Badge>
        {pendingCount > 0 && (
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs text-yellow-600 bg-yellow-500/10 border-yellow-500/20">
            {pendingCount} Pending
          </Badge>
        )}
        <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs text-green-600 bg-green-500/10 border-green-500/20">
          <UserPlus className="h-3 w-3" />
          {approvedCount} Approved
        </Badge>
        <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs">
          <Users className="h-3 w-3" />
          {teams.length} Teams
        </Badge>
        <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs">
          <Flame className="h-3 w-3" />
          {heats.length} Heats
        </Badge>
      </div>

      {/* Inner tabs */}
      <Tabs defaultValue="registrations" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-10">
          <TabsTrigger value="registrations" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardList className="h-3.5 w-3.5 hidden sm:block" />
            Athletes
          </TabsTrigger>
          <TabsTrigger value="teams" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-3.5 w-3.5 hidden sm:block" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="judges" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Gavel className="h-3.5 w-3.5 hidden sm:block" />
            Judges
          </TabsTrigger>
          <TabsTrigger value="heats" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Flame className="h-3.5 w-3.5 hidden sm:block" />
            Heats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registrations" className="mt-4">
          <RegistrationManager competitionId={competitionId} canAdmin={canAdmin} />
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          <TeamsPanel competitionId={competitionId} isOwner={canAdmin} />
        </TabsContent>

        <TabsContent value="judges" className="mt-4">
          <JudgesPanelWrapper competitionId={competitionId} canAdmin={canAdmin} />
        </TabsContent>

        <TabsContent value="heats" className="mt-4">
          <HeatManagementPanel competitionId={competitionId} canAdmin={canAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
