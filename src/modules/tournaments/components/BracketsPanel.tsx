import { useState } from "react";
import { useBrackets, useBouts, useTeams, useGenerateBrackets, useDeleteBrackets, useUpdateBoutWinner } from "@/modules/tournaments/hooks";
import { generateBrackets, type BracketParticipant } from "@/modules/tournaments/bracketGenerator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Trophy, Swords, RotateCcw } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BracketsPanelProps {
  competitionId: string;
  canAdmin: boolean;
}

export function BracketsPanel({ competitionId, canAdmin }: BracketsPanelProps) {
  const { data: brackets = [], isLoading: bracketsLoading } = useBrackets(competitionId);
  const { data: teams = [] } = useTeams(competitionId);
  const generateMutation = useGenerateBrackets();
  const deleteMutation = useDeleteBrackets();

  const handleGenerate = () => {
    if (teams.length < 2) {
      toast.error("At least 2 teams are required to generate brackets");
      return;
    }

    const participants: BracketParticipant[] = teams.map((t) => ({
      teamId: t.id,
      teamName: t.team_name,
      divisionId: t.division_id,
    }));

    const generated = generateBrackets(participants);

    if (generated.length === 0) {
      toast.error("Not enough participants per group to generate brackets");
      return;
    }

    generateMutation.mutate(
      { competitionId, brackets: generated },
      {
        onSuccess: () => toast.success("Brackets generated successfully"),
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  const handleRegenerate = () => {
    deleteMutation.mutate(competitionId, {
      onSuccess: () => {
        handleGenerate();
      },
      onError: (err) => toast.error((err as Error).message),
    });
  };

  if (bracketsLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      {canAdmin && (
        <div className="flex gap-3 flex-wrap">
          {brackets.length === 0 ? (
            <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
              <Swords className="h-4 w-4 mr-2" />
              Generate Brackets
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={deleteMutation.isPending || generateMutation.isPending}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Regenerate Brackets
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Regenerate Brackets?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all existing brackets and bout results, then create new ones from the current teams.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRegenerate}>Regenerate</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}

      {brackets.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted border border-border">
          <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">No brackets generated yet. Add teams and generate brackets to start.</p>
        </div>
      )}

      {brackets.map((bracket) => (
        <BracketCard
          key={bracket.id}
          bracketId={bracket.id}
          bracketName={bracket.name}
          bracketType={bracket.bracket_type}
          teams={teams}
          canAdmin={canAdmin}
        />
      ))}
    </div>
  );
}

function BracketCard({
  bracketId,
  bracketName,
  bracketType,
  teams,
  canAdmin,
}: {
  bracketId: string;
  bracketName: string;
  bracketType: string;
  teams: { id: string; team_name: string }[];
  canAdmin: boolean;
}) {
  const { data: bouts = [], isLoading } = useBouts(bracketId);
  const updateWinner = useUpdateBoutWinner();

  const teamMap = new Map(teams.map((t) => [t.id, t.team_name]));
  const rounds = [...new Set(bouts.map((b) => b.round_number))].sort((a, b) => a - b);

  const handleSetWinner = (boutId: string, winnerId: string) => {
    updateWinner.mutate(
      { boutId, winnerId, bracketId },
      {
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold uppercase">{bracketName}</CardTitle>
          <Badge variant="outline" className="text-xs">{bracketType.replace("_", " ")}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 overflow-x-auto pb-2">
          {rounds.map((round) => (
            <div key={round} className="min-w-[200px] space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Round {round}
              </p>
              {bouts
                .filter((b) => b.round_number === round)
                .map((bout) => (
                  <BoutCard
                    key={bout.id}
                    bout={bout}
                    teamMap={teamMap}
                    canAdmin={canAdmin}
                    onSetWinner={handleSetWinner}
                    isPending={updateWinner.isPending}
                  />
                ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BoutCard({
  bout,
  teamMap,
  canAdmin,
  onSetWinner,
  isPending,
}: {
  bout: { id: string; team_a_id: string | null; team_b_id: string | null; winner_id: string | null; status: string; bout_number: number };
  teamMap: Map<string, string>;
  canAdmin: boolean;
  onSetWinner: (boutId: string, winnerId: string) => void;
  isPending: boolean;
}) {
  const teamAName = bout.team_a_id ? teamMap.get(bout.team_a_id) ?? "TBD" : "TBD";
  const teamBName = bout.team_b_id ? teamMap.get(bout.team_b_id) ?? "TBD" : "TBD";
  const isCompleted = bout.status === "completed";
  const isBye = bout.status === "bye";

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${isCompleted ? "border-accent/40 bg-accent/5" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Bout {bout.bout_number}</span>
        {isCompleted && <Trophy className="h-3 w-3 text-accent" />}
        {isBye && <Badge variant="secondary" className="text-xs">BYE</Badge>}
      </div>

      <TeamSlot
        name={teamAName}
        teamId={bout.team_a_id}
        isWinner={bout.winner_id === bout.team_a_id && bout.team_a_id !== null}
        canSelect={canAdmin && !isCompleted && !isBye && bout.team_a_id !== null && bout.team_b_id !== null}
        onSelect={() => bout.team_a_id && onSetWinner(bout.id, bout.team_a_id)}
        isPending={isPending}
      />
      <div className="text-center text-xs text-muted-foreground">vs</div>
      <TeamSlot
        name={teamBName}
        teamId={bout.team_b_id}
        isWinner={bout.winner_id === bout.team_b_id && bout.team_b_id !== null}
        canSelect={canAdmin && !isCompleted && !isBye && bout.team_a_id !== null && bout.team_b_id !== null}
        onSelect={() => bout.team_b_id && onSetWinner(bout.id, bout.team_b_id)}
        isPending={isPending}
      />
    </div>
  );
}

function TeamSlot({
  name,
  teamId,
  isWinner,
  canSelect,
  onSelect,
  isPending,
}: {
  name: string;
  teamId: string | null;
  isWinner: boolean;
  canSelect: boolean;
  onSelect: () => void;
  isPending: boolean;
}) {
  return (
    <button
      type="button"
      disabled={!canSelect || isPending}
      onClick={onSelect}
      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
        isWinner
          ? "bg-accent/20 text-accent-foreground font-semibold border border-accent/30"
          : canSelect
          ? "bg-secondary hover:bg-secondary/80 text-secondary-foreground cursor-pointer"
          : "bg-muted text-muted-foreground cursor-default"
      }`}
    >
      {name}
    </button>
  );
}
