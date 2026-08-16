import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useUpdateCompetitionStatus } from "@/modules/tournaments/hooks";
import { toast } from "sonner";
import type { CompetitionStatus } from "@/modules/tournaments/stateMachine";
import { getStatusLabel } from "@/modules/tournaments/stateMachine";
import { validateTransition, type TransitionContext } from "@/modules/tournaments/statusValidation";
import { supabase } from "@/integrations/supabase/client";
import { Send, Play, CheckCircle, Check, AlertTriangle, XCircle, Loader2 } from "lucide-react";

interface CompetitionStatusActionsProps {
  competitionId: string;
  currentStatus: CompetitionStatus;
  canAdmin: boolean;
}

const TRANSITIONS: Record<string, { next: CompetitionStatus; label: string; icon: React.ReactNode; description: string }> = {
  draft: {
    next: "published",
    label: "Publish Competition",
    icon: <Send className="h-4 w-4" />,
    description: "Make this competition visible and open for registration.",
  },
  published: {
    next: "live",
    label: "Go Live",
    icon: <Play className="h-4 w-4" />,
    description: "Start the competition. Scores can now be submitted.",
  },
  live: {
    next: "completed",
    label: "Mark Completed",
    icon: <CheckCircle className="h-4 w-4" />,
    description: "End the competition and lock all scores.",
  },
};

async function fetchTransitionContext(competitionId: string): Promise<TransitionContext> {
  const count = { count: "exact" as const, head: true };
  const [comp, divisions, workouts, registrations, teams, heats, judges, scores, unlocked] = await Promise.all([
    supabase
      .from("competitions")
      .select("name, start_date, registration_deadline, venue, poster_url")
      .eq("id", competitionId)
      .maybeSingle(),
    supabase.from("competition_divisions").select("id", count).eq("competition_id", competitionId),
    supabase.from("competition_workouts").select("id", count).eq("competition_id", competitionId),
    supabase.from("athlete_registrations").select("id", count).eq("competition_id", competitionId),
    supabase.from("competition_teams").select("id", count).eq("competition_id", competitionId),
    supabase.from("heat_schedule").select("id", count).eq("competition_id", competitionId),
    supabase.from("competition_judges").select("id", count).eq("competition_id", competitionId),
    supabase.from("competition_scores").select("id", count).eq("competition_id", competitionId),
    supabase.from("competition_scores").select("id", count).eq("competition_id", competitionId).eq("locked", false),
  ]);

  return {
    name: comp.data?.name ?? null,
    startDate: comp.data?.start_date ?? null,
    registrationDeadline: comp.data?.registration_deadline ?? null,
    venue: comp.data?.venue ?? null,
    posterUrl: comp.data?.poster_url ?? null,
    divisionCount: divisions.count ?? 0,
    workoutCount: workouts.count ?? 0,
    registrationCount: registrations.count ?? 0,
    teamCount: teams.count ?? 0,
    heatCount: heats.count ?? 0,
    judgeCount: judges.count ?? 0,
    scoreCount: scores.count ?? 0,
    unlockedScoreCount: unlocked.count ?? 0,
  };
}

export function CompetitionStatusActions({ competitionId, currentStatus, canAdmin }: CompetitionStatusActionsProps) {
  const { mutate: updateStatus, isPending } = useUpdateCompetitionStatus();
  const [open, setOpen] = useState(false);

  const transition = TRANSITIONS[currentStatus];

  const { data: ctx, isFetching } = useQuery({
    queryKey: ["competition-transition-context", competitionId, currentStatus],
    queryFn: () => fetchTransitionContext(competitionId),
    enabled: open && canAdmin && !!transition,
    staleTime: 0,
  });

  if (!canAdmin || !transition) return null;

  const validation = ctx ? validateTransition(currentStatus, transition.next, ctx) : null;

  const handleConfirm = () => {
    updateStatus(
      { id: competitionId, status: transition.next },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success(`Competition is now ${getStatusLabel(transition.next)}`);
        },
        onError: (err) => toast.error((err as Error).message),
      }
    );
  };

  return (
    <>
      <div className="flex items-center gap-3 p-3 mb-6 rounded-lg bg-card border border-border">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              {getStatusLabel(currentStatus)}
            </Badge>
            <span className="text-muted-foreground text-xs">→</span>
            <Badge className="text-xs">{getStatusLabel(transition.next)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{transition.description}</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} disabled={isPending} className="shrink-0 gap-1.5">
          {transition.icon}
          {transition.label}
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={(o) => !isPending && setOpen(o)}>
        <AlertDialogContent className="max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{validation?.title ?? "Change competition status?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {validation?.description ?? "Checking competition readiness…"}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isFetching && !validation && (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Running readiness checks…
            </div>
          )}

          {validation && (
            <div className="space-y-1.5 py-1">
              {validation.checks.map((c) => {
                const Icon = c.passed ? Check : c.level === "blocker" ? XCircle : AlertTriangle;
                const tone = c.passed
                  ? "text-muted-foreground"
                  : c.level === "blocker"
                    ? "text-destructive"
                    : "text-amber-600 dark:text-amber-400";
                return (
                  <div key={c.label} className={`flex items-start gap-2 text-sm ${tone}`}>
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{c.label}</span>
                  </div>
                );
              })}

              {validation.blockers.length > 0 && (
                <p className="text-xs text-destructive pt-2">
                  Resolve the items above before you can continue.
                </p>
              )}
              {validation.blockers.length === 0 && validation.warnings.length > 0 && (
                <p className="text-xs text-muted-foreground pt-2">
                  These are warnings only — you can continue if this is intentional.
                </p>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={isPending || !validation?.canProceed}
            >
              {isPending ? "Saving…" : (validation?.confirmLabel ?? "Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
