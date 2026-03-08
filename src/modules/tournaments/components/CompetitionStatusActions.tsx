import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUpdateCompetitionStatus } from "@/modules/tournaments/hooks";
import { toast } from "sonner";
import type { CompetitionStatus } from "@/modules/tournaments/stateMachine";
import { getStatusLabel } from "@/modules/tournaments/stateMachine";
import { Send, Play, CheckCircle } from "lucide-react";

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

export function CompetitionStatusActions({ competitionId, currentStatus, canAdmin }: CompetitionStatusActionsProps) {
  const { mutate: updateStatus, isPending } = useUpdateCompetitionStatus();

  if (!canAdmin) return null;

  const transition = TRANSITIONS[currentStatus];
  if (!transition) return null;

  const handleTransition = () => {
    updateStatus(
      { id: competitionId, status: transition.next },
      {
        onSuccess: () => toast.success(`Competition is now ${getStatusLabel(transition.next)}`),
        onError: (err) => toast.error((err as Error).message),
      }
    );
  };

  return (
    <div className="flex items-center gap-3 p-3 mb-6 rounded-lg bg-card border border-border">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-xs">
            {getStatusLabel(currentStatus)}
          </Badge>
          <span className="text-muted-foreground text-xs">→</span>
          <Badge className="text-xs">
            {getStatusLabel(transition.next)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{transition.description}</p>
      </div>
      <Button size="sm" onClick={handleTransition} disabled={isPending} className="shrink-0 gap-1.5">
        {transition.icon}
        {transition.label}
      </Button>
    </div>
  );
}
