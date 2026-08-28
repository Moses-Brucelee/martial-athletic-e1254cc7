import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trophy, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  useCompetitionSettings,
  useUpsertCompetitionSettings,
  useDeleteCompetition,
} from "@/modules/tournaments/hooks-engine";

interface CompetitionSettingsPanelProps {
  competitionId: string;
  competitionName: string;
  canAdmin: boolean;
  /** Only the creator or a super user may delete the competition. */
  canDelete: boolean;
}

const SCORING_MODELS = [
  {
    value: "points",
    label: "Rank points (higher is better)",
    desc: "1st place earns the most points (100, 95, 90…). Highest total wins.",
  },
  {
    value: "placement",
    label: "Placement points (lower is better)",
    desc: "1st = 1 point, 2nd = 2 points, and so on. Lowest total wins.",
  },
];

const GLOBAL_TIE_BREAKERS = [
  {
    value: "none",
    label: "No global tie breaker",
    desc: "Teams with the same overall score remain tied and share the applicable position.",
  },
  {
    value: "most_wins_placements",
    label: "Most wins, then top placements",
    desc: "When teams are tied on the overall score: Most 1st-place finishes wins. If still tied, compare the number of 2nd-place finishes. Then 3rd-place finishes, and so on.",
  },
];


export function CompetitionSettingsPanel({
  competitionId,
  competitionName,
  canAdmin,
  canDelete,
}: CompetitionSettingsPanelProps) {
  const navigate = useNavigate();
  const { data: settings } = useCompetitionSettings(competitionId);
  const upsert = useUpsertCompetitionSettings();
  const deleteComp = useDeleteCompetition();
  const [deleting, setDeleting] = useState(false);

  const scoringModel = (settings as any)?.scoring_model ?? "points";
  const tieBreaker = settings?.tie_breaker_policy ?? "best_final_round";
  const globalTieBreaker = (settings as any)?.global_tie_breaker ?? "none";

  const save = async (patch: Record<string, unknown>) => {
    try {
      await upsert.mutateAsync({ competitionId, settings: patch as any });
      toast.success("Scoring settings updated");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteComp.mutateAsync(competitionId);
      toast.success("Competition deleted");
      navigate("/competitions");
    } catch (err) {
      toast.error((err as Error).message);
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Scoring &amp; Tie Breakers
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Scoring model
            </Label>
            <Select
              value={scoringModel}
              disabled={!canAdmin || upsert.isPending}
              onValueChange={(v) => save({ scoring_model: v, ranking_direction: v === "placement" ? "asc" : "desc" })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCORING_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {SCORING_MODELS.find((m) => m.value === scoringModel)?.desc}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Tie breaker
            </Label>
            <Select
              value={tieBreaker}
              disabled={!canAdmin || upsert.isPending}
              onValueChange={(v) => save({ tie_breaker_policy: v })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIE_BREAKERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Applied when two teams finish on the same total.
            </p>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Global tie breaker
            </Label>
            <Select
              value={globalTieBreaker}
              disabled={!canAdmin || upsert.isPending}
              onValueChange={(v) => save({ global_tie_breaker: v })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GLOBAL_TIE_BREAKERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {GLOBAL_TIE_BREAKERS.find((t) => t.value === globalTieBreaker)?.desc}
            </p>
          </div>
        </div>
      </div>

      {canDelete && (
        <div className="bg-card border border-destructive/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="text-sm font-bold text-destructive uppercase tracking-wider">
              Danger zone
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            Deleting this competition permanently removes its divisions, teams, registrations,
            workouts, heats and scores. This cannot be undone.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-1.5" disabled={deleting}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete competition
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{competitionName}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  Every division, team, registration, workout, heat and score for this
                  competition will be permanently deleted. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
