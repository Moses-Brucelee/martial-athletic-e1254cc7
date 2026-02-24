import { useParams } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useCompetitionRole } from "@/hooks/useCompetitionRole";
import { useSuperUserAccess } from "@/hooks/useSuperUserAccess";
import { useCompetition } from "@/modules/tournaments/hooks";
import { CompetitionHeader } from "@/components/CompetitionHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

// Module components — self-contained, fetch their own data
import { TeamsPanel } from "@/modules/tournaments/components/TeamsPanel";
import { WorkoutsPanel } from "@/modules/tournaments/components/WorkoutsPanel";
import { DivisionsPanel } from "@/modules/tournaments/components/DivisionsPanel";
import { ScoresPanel } from "@/modules/scoring/components/ScoresPanel";
import { MobileJudgeScoring } from "@/modules/scoring/components/MobileJudgeScoring";
import { ScoreLockControls } from "@/modules/scoring/components/ScoreLockControls";
import { LeaderboardPanel } from "@/modules/leaderboard/components/LeaderboardPanel";
import { ParticipantsPanel } from "@/modules/athletes/components/ParticipantsPanel";
import { BracketsPanel } from "@/modules/tournaments/components/BracketsPanel";
import { CompetitionStatusBar } from "@/modules/tournaments/components/CompetitionStatusBar";
import type { CompetitionStatus } from "@/modules/tournaments/stateMachine";
import { V1_FULL_ACCESS } from "@/lib/featureFlags";
import { PosterUpload } from "@/components/competition/PosterUpload";

export default function CompetitionDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { isOwner, isJudge, loading: roleLoading } = useCompetitionRole(id);
  const { isSuperUser } = useSuperUserAccess();
  const { data: competition, isLoading: compLoading, error: compError, refetch: refetchComp } = useCompetition(id);
  const isMobile = useIsMobile();

  // V1: bypass tier check, but preserve role-based access
  const canAdmin = V1_FULL_ACCESS
    ? (isOwner || isSuperUser)
    : (isOwner || isSuperUser); // same for now; when subscriptions return, add tier check back
  const canScore = V1_FULL_ACCESS
    ? (isOwner || isJudge || isSuperUser)
    : (isOwner || isJudge || isSuperUser);

  if (profileLoading || compLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-14 w-full" />
        <div className="max-w-5xl mx-auto p-6 grid sm:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const ScoreTab = () => (
    isMobile && canScore ? (
      <MobileJudgeScoring competitionId={id!} judgeId={user?.id} />
    ) : (
      <ScoresPanel competitionId={id!} canScore={canScore} judgeId={user?.id} />
    )
  );

  const renderOwnerTabs = () => (
    <Tabs defaultValue="setup" className="w-full">
      <TabsList className="w-full overflow-x-auto flex mb-6">
        <TabsTrigger value="setup" className="flex-1">Setup</TabsTrigger>
        <TabsTrigger value="judges" className="flex-1">Judges</TabsTrigger>
        <TabsTrigger value="brackets" className="flex-1">Brackets</TabsTrigger>
        <TabsTrigger value="scores" className="flex-1">Scores</TabsTrigger>
        <TabsTrigger value="leaderboard" className="flex-1">Leaderboard</TabsTrigger>
        <TabsTrigger value="roster" className="flex-1">Roster</TabsTrigger>
        <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
      </TabsList>

      <TabsContent value="setup">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DivisionsPanel competitionId={id!} canAdmin={canAdmin} />
          <TeamsPanel competitionId={id!} isOwner={canAdmin} />
          <WorkoutsPanel competitionId={id!} isOwner={canAdmin} />
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-bold text-foreground uppercase mb-4">Score Locks</h3>
            <ScoreLockControls competitionId={id!} canAdmin={canAdmin} isSuperUser={isSuperUser} />
          </div>
          {competition && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-bold text-foreground uppercase mb-4">Age Category</h3>
              <div className="space-y-2 text-sm">
                <p className="text-foreground">
                  <span className="text-muted-foreground">Type: </span>
                  {competition.age_category_type === "under_x" ? "Under X" :
                   competition.age_category_type === "age_range" ? "Age Range" : "Open"}
                </p>
                {competition.min_age != null && (
                  <p className="text-foreground"><span className="text-muted-foreground">Min Age: </span>{competition.min_age}</p>
                )}
                {competition.max_age != null && (
                  <p className="text-foreground"><span className="text-muted-foreground">Max Age: </span>{competition.max_age}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="judges">
        <JudgesPanelLazy competitionId={id!} canAdmin={canAdmin} />
      </TabsContent>

      <TabsContent value="brackets">
        <BracketsPanel competitionId={id!} canAdmin={canAdmin} />
      </TabsContent>

      <TabsContent value="scores"><ScoreTab /></TabsContent>
      <TabsContent value="leaderboard"><LeaderboardPanel competitionId={id!} /></TabsContent>
      <TabsContent value="roster"><ParticipantsPanel competitionId={id!} canAdmin={canAdmin} /></TabsContent>

      <TabsContent value="overview">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TeamsPanel competitionId={id!} isOwner={false} />
          <WorkoutsPanel competitionId={id!} isOwner={false} />
        </div>
      </TabsContent>
    </Tabs>
  );

  const renderJudgeTabs = () => (
    <Tabs defaultValue="scores" className="w-full">
      <TabsList className="w-full grid grid-cols-4 mb-6">
        <TabsTrigger value="scores">Scores</TabsTrigger>
        <TabsTrigger value="brackets">Brackets</TabsTrigger>
        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        <TabsTrigger value="roster">Roster</TabsTrigger>
      </TabsList>

      <TabsContent value="scores"><ScoreTab /></TabsContent>
      <TabsContent value="brackets"><BracketsPanel competitionId={id!} canAdmin={false} /></TabsContent>
      <TabsContent value="leaderboard"><LeaderboardPanel competitionId={id!} /></TabsContent>
      <TabsContent value="roster"><ParticipantsPanel competitionId={id!} canAdmin={false} /></TabsContent>
    </Tabs>
  );

  const renderViewerTabs = () => (
    <Tabs defaultValue="leaderboard" className="w-full">
      <TabsList className="w-full grid grid-cols-3 mb-6">
        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        <TabsTrigger value="roster">Roster</TabsTrigger>
        <TabsTrigger value="overview">Overview</TabsTrigger>
      </TabsList>

      <TabsContent value="leaderboard"><LeaderboardPanel competitionId={id!} /></TabsContent>
      <TabsContent value="roster"><ParticipantsPanel competitionId={id!} canAdmin={false} /></TabsContent>
      <TabsContent value="overview">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TeamsPanel competitionId={id!} isOwner={false} />
          <WorkoutsPanel competitionId={id!} isOwner={false} />
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CompetitionHeader
        title="Tournament"
        avatarUrl={profile?.avatar_url}
        displayName={profile?.display_name}
      />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <h2 className="text-2xl font-bold text-foreground tracking-tight uppercase mb-1">
          Competition Dashboard
        </h2>
        {competition && (
          <>
            <p className="text-muted-foreground mb-2">{competition.name}</p>
            {canAdmin && (
              <div className="mb-4">
                <PosterUpload
                  competitionId={id!}
                  currentPosterUrl={competition.poster_url}
                  onPosterUpdated={() => refetchComp()}
                />
              </div>
            )}
          </>
        )}
        {competition && (
          <CompetitionStatusBar
            competitionId={id!}
            status={(competition.status || "draft") as CompetitionStatus}
            canAdmin={canAdmin}
          />
        )}

        {compError && (
          <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{(compError as Error).message}</p>
          </div>
        )}

        {canAdmin ? renderOwnerTabs() : isJudge ? renderJudgeTabs() : renderViewerTabs()}
      </main>
    </div>
  );
}

// Lazy wrapper for JudgesPanel to keep using the existing component
import { JudgesPanel as OriginalJudgesPanel } from "@/components/competition/JudgesPanel";
import { useJudges } from "@/modules/admin/hooks";
import { useState } from "react";

function JudgesPanelLazy({ competitionId, canAdmin }: { competitionId: string; canAdmin: boolean }) {
  const { data: judges = [] } = useJudges(competitionId);
  const [localJudges, setLocalJudges] = useState(judges);

  // Keep synced
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
