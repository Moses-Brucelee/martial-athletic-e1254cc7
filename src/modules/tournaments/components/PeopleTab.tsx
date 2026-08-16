import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Gavel, Flame, Users2 } from "lucide-react";
import { UnifiedAthleteTable } from "@/modules/tournaments/components/UnifiedAthleteTable";
import { TeamsListView } from "@/modules/tournaments/components/TeamsListView";
import { HeatManagementPanel } from "@/modules/tournaments/components/HeatManagementPanel";
import { JudgesPanel as OriginalJudgesPanel } from "@/components/competition/JudgesPanel";
import { ShareCompetitionMenu } from "@/components/competition/ShareCompetitionMenu";
import { useJudges } from "@/modules/admin/hooks";
import { useRegistrations } from "@/modules/athletes/hooks";
import { useTeams, useCompetition } from "@/modules/tournaments/hooks";
import { useHeats } from "@/modules/tournaments/hooks-engine";
import type { CompetitionStatus } from "@/modules/tournaments/stateMachine";

interface PeopleTabProps {
  competitionId: string;
  canAdmin: boolean;
  derivedStatus: CompetitionStatus;
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
  const { data: competition } = useCompetition(competitionId);
  const { data: divisions = [] } = useDivisions(competitionId);

  // Teams only make sense when at least one division allows more than one athlete.
  const teamsEnabled = divisions.some((d) => Number((d as any).team_size ?? 1) > 1);

  const approvedCount = registrations.filter(
    (r) => r.status === "approved" || r.status === "confirmed"
  ).length;

  const showShareLink = derivedStatus === "published" || derivedStatus === "live";


  return (
    <div className="space-y-4">
      {showShareLink && (
        <div className="flex items-center justify-between gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground mb-0.5">
              Registration is open
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              Share the link so athletes can register as individuals or teams.
            </p>
          </div>
          <ShareCompetitionMenu
            competitionId={competitionId}
            competitionName={competition?.name}
            startDate={competition?.start_date}
            venue={competition?.venue}
          />
        </div>
      )}

      {/* Inner tabs — Athletes, Teams, Judges, Heats */}
      <Tabs defaultValue="athletes" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-10">
          <TabsTrigger value="athletes" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-3.5 w-3.5 hidden sm:block" />
            Athletes
            <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px] bg-background">{approvedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="teams" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users2 className="h-3.5 w-3.5 hidden sm:block" />
            Teams
            <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px] bg-background">{teams.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="judges" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Gavel className="h-3.5 w-3.5 hidden sm:block" />
            Judges
          </TabsTrigger>
          <TabsTrigger value="heats" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Flame className="h-3.5 w-3.5 hidden sm:block" />
            Heats
            <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px] bg-background">{heats.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="athletes" className="mt-4">
          <UnifiedAthleteTable competitionId={competitionId} canAdmin={canAdmin} />
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          <TeamsListView competitionId={competitionId} canAdmin={canAdmin} />
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
