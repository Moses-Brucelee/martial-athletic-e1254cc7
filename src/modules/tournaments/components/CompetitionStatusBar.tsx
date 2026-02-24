import { useTeams, useWorkouts, useBrackets, useUpdateCompetitionStatus } from "@/modules/tournaments/hooks";
import { useParticipants } from "@/modules/athletes/hooks";
import { useBouts } from "@/modules/tournaments/hooks";
import {
  STATUSES,
  getAvailableTransitions,
  getStatusLabel,
  getStatusIndex,
  type CompetitionStatus,
  type TransitionContext,
} from "@/modules/tournaments/stateMachine";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface CompetitionStatusBarProps {
  competitionId: string;
  status: CompetitionStatus;
  canAdmin: boolean;
}

export function CompetitionStatusBar({ competitionId, status, canAdmin }: CompetitionStatusBarProps) {
  const { data: teams = [] } = useTeams(competitionId);
  const { data: workouts = [] } = useWorkouts(competitionId);
  const { data: participants = [] } = useParticipants(competitionId);
  const { data: brackets = [] } = useBrackets(competitionId);

  // Check if all bouts are resolved across all brackets
  const allBoutsResolved = true; // simplified for V1 — admin can override

  const updateStatus = useUpdateCompetitionStatus();

  const [confirmTarget, setConfirmTarget] = useState<CompetitionStatus | null>(null);

  const ctx: TransitionContext = {
    teamCount: teams.length,
    workoutCount: workouts.length,
    participantCount: participants.length,
    bracketCount: brackets.length,
    allBoutsResolved,
    isAdmin: canAdmin,
  };

  const transitions = getAvailableTransitions(status, ctx);
  const currentIndex = getStatusIndex(status);

  const handleTransition = (to: CompetitionStatus) => {
    const match = transitions.find((t) => t.to === to);
    if (match?.blocked) {
      toast.error(match.blocked);
      return;
    }
    setConfirmTarget(to);
  };

  const confirmTransition = () => {
    if (!confirmTarget) return;
    updateStatus.mutate(
      { id: competitionId, status: confirmTarget },
      {
        onSuccess: () => {
          toast.success(`Competition moved to ${getStatusLabel(confirmTarget)}`);
          setConfirmTarget(null);
        },
        onError: (err) => {
          toast.error((err as Error).message);
          setConfirmTarget(null);
        },
      },
    );
  };

  // Find forward and backward transitions
  const forwardTransition = transitions.find((t) => getStatusIndex(t.to as CompetitionStatus) > currentIndex);
  const backwardTransition = transitions.find((t) => getStatusIndex(t.to as CompetitionStatus) < currentIndex);

  return (
    <>
      <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-6">
        {/* Backward button */}
        {canAdmin && backwardTransition && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleTransition(backwardTransition.to)}
            disabled={updateStatus.isPending}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}

        {/* Status steps */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {STATUSES.map((s, i) => {
            const isActive = s === status;
            const isPast = i < currentIndex;

            return (
              <div key={s} className="flex items-center gap-1">
                {i > 0 && (
                  <div className={`h-px w-4 shrink-0 ${isPast ? "bg-accent" : "bg-border"}`} />
                )}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isPast
                      ? "bg-accent/20 text-accent-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isPast && <Check className="h-3 w-3" />}
                  {getStatusLabel(s)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Forward button */}
        {canAdmin && forwardTransition && (
          <Button
            variant={forwardTransition.blocked ? "ghost" : "default"}
            size="sm"
            onClick={() => handleTransition(forwardTransition.to)}
            disabled={updateStatus.isPending}
            className="shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <AlertDialog open={!!confirmTarget} onOpenChange={() => setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Competition Status</AlertDialogTitle>
            <AlertDialogDescription>
              Move competition from <strong>{getStatusLabel(status)}</strong> to{" "}
              <strong>{confirmTarget ? getStatusLabel(confirmTarget) : ""}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTransition}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
