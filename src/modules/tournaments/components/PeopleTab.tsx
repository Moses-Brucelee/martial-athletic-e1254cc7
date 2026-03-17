import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Copy, Check, Users, Gavel, Flame } from "lucide-react";
import { toast } from "sonner";
import { UnifiedAthleteTable } from "@/modules/tournaments/components/UnifiedAthleteTable";
import { HeatManagementPanel } from "@/modules/tournaments/components/HeatManagementPanel";
import { JudgesPanel as OriginalJudgesPanel } from "@/components/competition/JudgesPanel";
import { useJudges } from "@/modules/admin/hooks";
import { useRegistrations } from "@/modules/athletes/hooks";
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
  const { data: heats = [] } = useHeats(competitionId);

  const approvedCount = registrations.filter(
    (r) => r.status === "approved" || r.status === "confirmed"
  ).length;

  const showShareLink = derivedStatus === "published" || derivedStatus === "live";

  return (
    <div className="space-y-4">
      {showShareLink && <ShareableLink competitionId={competitionId} />}

      {/* Inner tabs — Athletes (unified), Judges, Heats */}
      <Tabs defaultValue="athletes" className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-10">
          <TabsTrigger value="athletes" className="text-xs sm:text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-3.5 w-3.5 hidden sm:block" />
            Athletes
            <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px] bg-background">{approvedCount}</Badge>
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
