import { useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useCompetitionRole } from "@/hooks/useCompetitionRole";
import { useSuperUserAccess } from "@/hooks/useSuperUserAccess";
import { useSubscription } from "@/hooks/useSubscription";
import { useCompetition, useDivisions, useTeams, useWorkouts } from "@/modules/tournaments/hooks";
import { useCompetitionSettings, useHeats } from "@/modules/tournaments/hooks-engine";
import { CompetitionSettingsPanel } from "@/modules/tournaments/components/CompetitionSettingsPanel";

import { CompetitionHeader } from "@/components/CompetitionHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowRight, Lock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { deriveStatus, isMutable, getStatusLabel } from "@/modules/tournaments/stateMachine";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ShareCompetitionMenu } from "@/components/competition/ShareCompetitionMenu";
import CompetitionPublic from "@/pages/CompetitionPublic";

// Module components
import { TeamsPanel } from "@/modules/tournaments/components/TeamsPanel";
import { WorkoutsPanel } from "@/components/competition/WorkoutsPanel";
import { QuickWorkoutsPanel } from "@/modules/tournaments/components/QuickWorkoutsPanel";
import { DivisionsPanel } from "@/modules/tournaments/components/DivisionsPanel";
import { ScoresPanel } from "@/modules/scoring/components/ScoresPanel";
import { QuickScoreEntry } from "@/modules/scoring/components/QuickScoreEntry";
import { MobileJudgeScoring } from "@/modules/scoring/components/MobileJudgeScoring";
import { ScoreLockControls } from "@/modules/scoring/components/ScoreLockControls";
import { ScoreTabErrorBoundary } from "@/components/ScoreTabErrorBoundary";
import { LeaderboardPanel } from "@/modules/leaderboard/components/LeaderboardPanel";
import { ParticipantsPanel } from "@/modules/athletes/components/ParticipantsPanel";
import { RegistrationManager } from "@/modules/athletes/components/RegistrationManager";
import { RegistrationTeamsView } from "@/components/competition/RegistrationTeamsView";
import { BracketsPanel } from "@/modules/tournaments/components/BracketsPanel";
import { PeopleTab } from "@/modules/tournaments/components/PeopleTab";
import { CompetitionStatusBar } from "@/modules/tournaments/components/CompetitionStatusBar";
import { CompetitionStatusActions } from "@/modules/tournaments/components/CompetitionStatusActions";
import { CommandCenter } from "@/modules/tournaments/components/CommandCenter";
import { HeatManagementPanel } from "@/modules/tournaments/components/HeatManagementPanel";
import { JudgeAssignmentPanel } from "@/modules/tournaments/components/JudgeAssignmentPanel";
import type { CompetitionStatus } from "@/modules/tournaments/stateMachine";
import { V1_FULL_ACCESS } from "@/lib/featureFlags";
import { CompetitionEditPanel } from "@/modules/tournaments/components/CompetitionEditPanel";
import { PosterUpload } from "@/components/competition/PosterUpload";
import { SaveAsTemplate } from "@/modules/tournaments/components/SaveAsTemplate";

// Lazy wrapper for JudgesPanel (used in Advanced mode only)
import { JudgesPanel as OriginalJudgesPanel } from "@/components/competition/JudgesPanel";
import { useJudges } from "@/modules/admin/hooks";
import { useRegistrations } from "@/modules/athletes/hooks";
import { useScores } from "@/modules/scoring/hooks";
import { getCompetitionWorkflowRecommendation, type CompetitionWorkflowSection } from "@/modules/tournaments/competitionWorkflow";
function JudgesPanelLazy({ competitionId, canAdmin }: { competitionId: string; canAdmin: boolean }) {
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

const OWNER_WORKFLOW: { value: CompetitionWorkflowSection; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "workouts", label: "Workouts" },
  { value: "people", label: "People" },
  { value: "heats", label: "Heats" },
  { value: "scoring", label: "Scoring" },
  { value: "leaderboard", label: "Leaderboard" },
];

export default function CompetitionDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { isOwner, isJudge, loading: roleLoading } = useCompetitionRole(id);
  const { isSuperUser } = useSuperUserAccess();
  const { tierKey } = useSubscription();
  const showRoster = tierKey !== "free" || isSuperUser;
  const { data: competition, isLoading: compLoading, error: compError, refetch: refetchComp } = useCompetition(id);
  const { data: settings, isLoading: settingsLoading } = useCompetitionSettings(id);
  const { data: workouts = [], isLoading: workoutsLoading } = useWorkouts(id);
  const { data: divisions = [], isLoading: divisionsLoading } = useDivisions(id);
  const { data: teams = [], isLoading: teamsLoading } = useTeams(id);
  const { data: registrations = [], isLoading: registrationsLoading } = useRegistrations(id);
  const { data: heats = [], isLoading: heatsLoading } = useHeats(id);
  const { data: scores = [], isLoading: scoresLoading } = useScores(id);
  const isMobile = useIsMobile();
  const [activeOwnerTab, setActiveOwnerTab] = useState<CompetitionWorkflowSection | null>(null);
  const [publishRequest, setPublishRequest] = useState(0);
  const ownerNavRef = useRef<HTMLDivElement>(null);

  const canAdmin = V1_FULL_ACCESS ? (isOwner || isSuperUser) : (isOwner || isSuperUser);
  const canScore = V1_FULL_ACCESS ? (isOwner || isJudge || isSuperUser) : (isOwner || isJudge || isSuperUser);

  // Derive lifecycle status
  const derivedStatus: CompetitionStatus = competition ? deriveStatus(competition) : "draft";
  const competitionMutable = isMutable(derivedStatus);

  // For completed/expired: force read-only
  const effectiveCanAdmin = canAdmin && competitionMutable;
  const effectiveCanScore = canScore && competitionMutable;

  const isQuickMode = settings?.setup_mode === "quick";

  const approvedRegistrations = useMemo(
    () => registrations.filter((registration) => registration.status === "approved" || registration.status === "confirmed"),
    [registrations],
  );
  const teamDivisionIds = useMemo(
    () => new Set(divisions.filter((division) => Number(division.team_size ?? 1) > 1).map((division) => division.id)),
    [divisions],
  );
  const eligibleTeamCount = teams.filter((team) => team.division_id && teamDivisionIds.has(team.division_id)).length;
  const eligibleSoloCount = approvedRegistrations.filter((registration) => {
    const division = divisions.find((candidate) => candidate.id === registration.division_id);
    return Number(division?.team_size ?? 1) <= 1;
  }).length;
  const eligibleEntrantCount = eligibleTeamCount + eligibleSoloCount;
  const completedScoreCount = new Set(scores.map((score) => `${score.team_id}::${score.workout_id}`)).size;
  const recommendation = getCompetitionWorkflowRecommendation({
    status: derivedStatus,
    workoutCount: workouts.length,
    eligibleEntrantCount,
    heatCount: heats.length,
    completedScoreCount,
  });

  useEffect(() => {
    if (activeOwnerTab) return;
    const aliases: Record<string, CompetitionWorkflowSection> = { command: "overview", setup: "overview", scores: "scoring" };
    const requested = tabFromUrl ? aliases[tabFromUrl] ?? tabFromUrl : null;
    const validRequested = OWNER_WORKFLOW.some((item) => item.value === requested) ? requested as CompetitionWorkflowSection : null;
    setActiveOwnerTab(validRequested ?? recommendation.section);
  }, [activeOwnerTab, tabFromUrl, recommendation.section]);

  useEffect(() => {
    if (!activeOwnerTab || !ownerNavRef.current) return;
    ownerNavRef.current.querySelector<HTMLElement>(`[data-value="${activeOwnerTab}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeOwnerTab]);

  if (profileLoading || compLoading || roleLoading || settingsLoading || workoutsLoading || divisionsLoading || teamsLoading || registrationsLoading || heatsLoading || scoresLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <Skeleton className="h-14 w-full" />
        <div className="max-w-5xl mx-auto p-6 grid sm:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const isReadOnly = !competitionMutable;

  const ScoreTab = () => {
    const inner = isQuickMode ? (
      <QuickScoreEntry competitionId={id!} canScore={effectiveCanScore} judgeId={user?.id} />
    ) : isMobile && effectiveCanScore ? (
      <MobileJudgeScoring competitionId={id!} judgeId={user?.id} />
    ) : (
      <ScoresPanel competitionId={id!} canScore={effectiveCanScore} judgeId={user?.id} />
    );
    return <ScoreTabErrorBoundary>{inner}</ScoreTabErrorBoundary>;
  };



  // Read-only view for completed/expired (non-owner)
  if (isReadOnly && !canAdmin) {
    return (
      <div className="min-h-dvh bg-background flex flex-col">
        <CompetitionHeader title="Tournament" avatarUrl={profile?.avatar_url} displayName={profile?.display_name} />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
          {competition && <h2 className="text-2xl font-bold text-foreground tracking-tight uppercase mb-1">{competition.name}</h2>}
          <p className="text-muted-foreground mb-2">Competition Dashboard</p>
          <CompetitionStatusBar status={derivedStatus} />

          <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-accent/10 border border-accent/20">
            <Lock className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">
              This competition is <strong>{getStatusLabel(derivedStatus).toLowerCase()}</strong>. Leaderboard only.
            </p>
          </div>

          <Tabs defaultValue="leaderboard" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-6">
              <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
            </TabsList>
            <TabsContent value="leaderboard"><LeaderboardPanel competitionId={id!} /></TabsContent>
            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TeamsPanel competitionId={id!} isOwner={false} />
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    );
  }

  const renderOwnerTabs = () => (
    <Tabs value={activeOwnerTab ?? recommendation.section} onValueChange={(value) => setActiveOwnerTab(value as CompetitionWorkflowSection)} className="w-full">
      <div className="relative mb-6">
        <div ref={ownerNavRef} className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <TabsList className="inline-grid min-w-max w-full grid-cols-6 gap-1 h-auto p-1.5">
            {OWNER_WORKFLOW.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                data-value={item.value}
                className="relative min-w-[118px] min-h-[48px] px-4 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                {item.label}
                {recommendation.section === item.value && activeOwnerTab !== item.value && (
                  <span className="absolute top-1 right-1.5 text-[9px] font-bold uppercase text-primary">Next</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>

      <TabsContent value="overview">
        <div className="space-y-6">
          <CommandCenter competitionId={id!} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {competition && (
            <div className="lg:col-span-2">
              <CompetitionEditPanel competition={competition} canEdit={effectiveCanAdmin} />
            </div>
          )}
          <DivisionsPanel competitionId={id!} canAdmin={effectiveCanAdmin} />
          {canAdmin && competition && (
            <div className="lg:col-span-2">
              <CompetitionSettingsPanel
                competitionId={id!}
                competitionName={competition.name}
                canAdmin={effectiveCanAdmin}
                canDelete={isOwner || isSuperUser}
              />
            </div>
          )}
          {competition && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-bold text-foreground uppercase mb-4">Poster</h3>
              <PosterUpload
                competitionId={id!}
                currentPosterUrl={competition.poster_url}
                onPosterUpdated={() => refetchComp()}
              />
            </div>
          )}
        </div>
        </div>
      </TabsContent>

      <TabsContent value="workouts">
        {isQuickMode
          ? <QuickWorkoutsPanel competitionId={id!} isOwner={effectiveCanAdmin} scoringMode={settings?.scoring_method === "auto" ? "auto" : "points"} />
          : <WorkoutsPanel competitionId={id!} workouts={[]} setWorkouts={() => {}} isOwner={effectiveCanAdmin} />}
      </TabsContent>

      <TabsContent value="people">
        <div className="space-y-6">
          {isQuickMode
            ? <PeopleTab competitionId={id!} canAdmin={effectiveCanAdmin} derivedStatus={derivedStatus} />
            : <>
                <RegistrationManager competitionId={id!} canAdmin={effectiveCanAdmin} />
                <TeamsPanel competitionId={id!} isOwner={effectiveCanAdmin} />
                <JudgesPanelLazy competitionId={id!} canAdmin={effectiveCanAdmin} />
                <JudgeAssignmentPanel competitionId={id!} canAdmin={effectiveCanAdmin} />
                {showRoster && <ParticipantsPanel competitionId={id!} canAdmin={effectiveCanAdmin} />}
              </>}
        </div>
      </TabsContent>

      <TabsContent value="heats">
        <div className="space-y-6">
          <HeatManagementPanel competitionId={id!} canAdmin={effectiveCanAdmin} />
          {!isQuickMode && <BracketsPanel competitionId={id!} canAdmin={effectiveCanAdmin} />}
        </div>
      </TabsContent>

      <TabsContent value="scoring">
        <div className="space-y-6">
          <ScoreTab />
          {!isQuickMode && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-bold text-foreground uppercase mb-4">Score Locks</h3>
              <ScoreLockControls competitionId={id!} canAdmin={effectiveCanAdmin} isSuperUser={isSuperUser} />
            </div>
          )}
        </div>
      </TabsContent>
      <TabsContent value="leaderboard"><LeaderboardPanel competitionId={id!} /></TabsContent>
    </Tabs>
  );

  const renderJudgeTabs = () => (
    <Tabs defaultValue="scoring" className="w-full">
      <TabsList className={`w-full grid ${showRoster ? "grid-cols-4" : "grid-cols-3"} mb-6`}>
        <TabsTrigger value="scoring">Scoring</TabsTrigger>
        <TabsTrigger value="brackets">Brackets</TabsTrigger>
        <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        {showRoster && <TabsTrigger value="roster">Roster</TabsTrigger>}
      </TabsList>

      <TabsContent value="scoring"><ScoreTab /></TabsContent>
      <TabsContent value="brackets"><BracketsPanel competitionId={id!} canAdmin={false} /></TabsContent>
      <TabsContent value="leaderboard"><LeaderboardPanel competitionId={id!} /></TabsContent>
      {showRoster && <TabsContent value="roster"><ParticipantsPanel competitionId={id!} canAdmin={false} /></TabsContent>}
    </Tabs>
  );

  const renderViewerTabs = () => {
    // Visibility rules:
    // - Leaderboard & Heats: only when live or completed
    // - Registration tab: only while registration is open (deadline not passed)
    // - Once deadline passes, hide Registration and show "closed" banner on Teams tab
    const isLive = derivedStatus === "live" || derivedStatus === "completed";
    const isCompleted = derivedStatus === "completed" || derivedStatus === "expired";
    const deadlinePassed = competition?.registration_deadline
      ? new Date() > new Date(competition.registration_deadline)
      : false;
    const registrationOpen = !deadlinePassed && !isCompleted;

    const viewerTabs: { value: string; label: string }[] = [];
    viewerTabs.push({ value: "registration", label: "Registration & Teams" });
    viewerTabs.push({ value: "workouts", label: "Workouts" });
    if (isLive) {
      viewerTabs.push({ value: "leaderboard", label: "Leaderboard" });
      viewerTabs.push({ value: "heats", label: "Heats" });
    }

    const initialTab =
      tabFromUrl && viewerTabs.some((t) => t.value === tabFromUrl)
        ? tabFromUrl
        : viewerTabs[0]?.value ?? "registration";

    return (
      <Tabs defaultValue={initialTab} className="w-full">
        <div className="relative mb-6">
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <TabsList className={`inline-flex w-auto min-w-full md:w-full md:grid gap-1`} style={{ gridTemplateColumns: `repeat(${viewerTabs.length}, minmax(0, 1fr))` }}>
              {viewerTabs.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="whitespace-nowrap min-h-[44px] px-3 text-xs sm:text-sm"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
        </div>

        <TabsContent value="registration">
          <RegistrationTeamsView
            competitionId={id!}
            competition={competition}
            canAdmin={false}
            registrationOpen={registrationOpen}
          />
        </TabsContent>
        <TabsContent value="workouts">
          <QuickWorkoutsPanel competitionId={id!} isOwner={false} scoringMode={settings?.scoring_method === "auto" ? "auto" : "points"} />
        </TabsContent>
        {isLive && (
          <>
            <TabsContent value="leaderboard"><LeaderboardPanel competitionId={id!} /></TabsContent>
            <TabsContent value="heats">
              <HeatManagementPanel competitionId={id!} canAdmin={false} />
            </TabsContent>
          </>
        )}
      </Tabs>
    );
  };

  const renderTabs = () => {
    if (effectiveCanAdmin) return renderOwnerTabs();
    if (isJudge) return renderJudgeTabs();
    return renderViewerTabs();
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <CompetitionHeader title="Tournament" avatarUrl={profile?.avatar_url} displayName={profile?.display_name} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {competition && (
          <h2 className="text-2xl font-bold text-foreground tracking-tight uppercase mb-1">{competition.name}</h2>
        )}
        {competition && (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <p className="text-muted-foreground">Competition Dashboard</p>
              <ShareCompetitionMenu
                competitionId={id!}
                competitionName={competition.name}
                startDate={competition.start_date}
                venue={competition.venue}
              />
            </div>
            {effectiveCanAdmin && !isQuickMode && (
              <div className="mb-4">
                <SaveAsTemplate competition={competition} competitionId={id!} />
              </div>
            )}
          </>
        )}
        <CompetitionStatusBar status={derivedStatus} />
        {canAdmin && (
          <div className="flex items-center justify-between gap-3 p-3 mb-6 rounded-lg bg-card border border-border">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">{recommendation.label}</p>
              <p className="text-xs text-muted-foreground">Recommended from the competition’s current progress.</p>
            </div>
            <Button
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => recommendation.action === "publish" ? setPublishRequest((value) => value + 1) : setActiveOwnerTab(recommendation.section)}
            >
              {recommendation.actionLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        <CompetitionStatusActions competitionId={id!} currentStatus={derivedStatus} canAdmin={canAdmin} compact openRequest={publishRequest} />

        {compError && (
          <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">Couldn't load competition data.</p>
          </div>
        )}

        {renderTabs()}
      </main>
    </div>
  );
}
