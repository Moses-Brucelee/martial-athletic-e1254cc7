import { useState, useEffect } from "react";
import { fetchScoringEvents } from "@/data/scoring";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ScoringEvent {
  id: string;
  competition_id: string;
  team_id: string;
  judge_id: string | null;
  event_type: string;
  payload: any;
  created_at: string;
}

export function AuditLog() {
  const [events, setEvents] = useState<ScoringEvent[]>([]);
  const [competitionId, setCompetitionId] = useState("");

  const loadEvents = async () => {
    if (!competitionId.trim()) return;
    try {
      const data = await fetchScoringEvents(competitionId.trim());
      setEvents(data as ScoringEvent[]);
    } catch {
      setEvents([]);
    }
  };

  useEffect(() => {
    if (competitionId.length === 36) loadEvents();
  }, [competitionId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Enter competition ID to view audit log..."
          value={competitionId}
          onChange={(e) => setCompetitionId(e.target.value)}
          className="bg-background"
        />
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events found.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events.map((e) => (
            <div key={e.id} className="p-3 rounded-lg border border-border bg-background text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-foreground uppercase">{e.event_type}</span>
                <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
              </div>
              <p className="text-muted-foreground">Team: {e.team_id?.slice(0, 8)}... | Judge: {e.judge_id?.slice(0, 8) || "N/A"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
