import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Layers, Plus, X, Users } from "lucide-react";
import { toast } from "sonner";
import { divisionNameSchema } from "@/lib/validation";
import { useDivisions } from "@/modules/tournaments/hooks";
import { addDivision, removeDivision, updateDivision } from "@/modules/tournaments/api";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DIVISION_PRESETS = [
  "RX Male", "RX Female", "Scaled Male", "Scaled Female", "Masters 35+",
];

const TEAM_SIZE_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10];

interface DivisionsPanelProps {
  competitionId: string;
  canAdmin: boolean;
}

export function DivisionsPanel({ competitionId, canAdmin }: DivisionsPanelProps) {
  const { data: divisions = [], isLoading } = useDivisions(competitionId);
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async (name?: string) => {
    const divName = name || newName;
    const parsed = divisionNameSchema.safeParse(divName);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setAdding(true);
    try {
      await addDivision(competitionId, divName.trim(), divisions.length);
      qc.invalidateQueries({ queryKey: ["divisions", competitionId] });
      if (!name) setNewName("");
      toast.success("Division added!");
    } catch { toast.error("Failed to add division"); }
    setAdding(false);
  };

  const handleRemove = async (id: string) => {
    try {
      await removeDivision(id);
      qc.invalidateQueries({ queryKey: ["divisions", competitionId] });
      toast.success("Division removed");
    } catch { toast.error("Failed to remove division"); }
  };

  const handleTeamSizeChange = async (id: string, size: number) => {
    try {
      await updateDivision(id, { team_size: size } as any);
      qc.invalidateQueries({ queryKey: ["divisions", competitionId] });
      toast.success(`Team size set to ${size}`);
    } catch { toast.error("Failed to update team size"); }
  };

  const existingNames = divisions.map((d) => d.name.toLowerCase());
  const availablePresets = DIVISION_PRESETS.filter((p) => !existingNames.includes(p.toLowerCase()));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Divisions</h3>
        <span className="text-xs text-muted-foreground">({divisions.length})</span>
      </div>

      {/* Active divisions with team-size selector */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : divisions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No divisions yet. Use presets or add your own.</p>
      ) : (
        <div className="space-y-1.5">
          {divisions.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background/40"
            >
              <Badge variant="secondary" className="text-xs font-medium px-2 py-1">
                {d.name}
              </Badge>
              <div className="ml-auto flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {canAdmin ? (
                  <Select
                    value={String((d as any).team_size ?? 1)}
                    onValueChange={(v) => handleTeamSizeChange(d.id, parseInt(v, 10))}
                  >
                    <SelectTrigger className="h-7 w-[110px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_SIZE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n === 1 ? "1 (Solo)" : `${n} per team`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {(d as any).team_size ?? 1} per team
                  </span>
                )}
                {canAdmin && (
                  <button
                    onClick={() => handleRemove(d.id)}
                    className="ml-1 rounded-full p-1 hover:bg-destructive/20 hover:text-destructive transition-colors"
                    aria-label="Remove division"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick presets */}
      {canAdmin && availablePresets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availablePresets.map((preset) => (
            <button
              key={preset}
              disabled={adding}
              onClick={() => handleAdd(preset)}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              <Plus className="h-2.5 w-2.5" /> {preset}
            </button>
          ))}
        </div>
      )}

      {/* Custom input */}
      {canAdmin && (
        <div className="flex gap-2">
          <Input
            placeholder="Custom division…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newName.trim() && handleAdd()}
            className="bg-background flex-1 h-8 text-xs"
            maxLength={100}
          />
          <Button
            onClick={() => handleAdd()}
            disabled={adding || !newName.trim()}
            size="sm"
            className="bg-accent hover:bg-accent/90 text-accent-foreground h-8 px-3"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
