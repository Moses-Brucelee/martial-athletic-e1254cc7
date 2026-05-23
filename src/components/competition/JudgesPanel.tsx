import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Gavel, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { addJudge, addGuestJudge, removeJudge, searchRegisteredUsers } from "@/data/judges";
import type { Judge } from "@/domain/judges";
import { supabase } from "@/integrations/supabase/client";

interface JudgesPanelProps {
  competitionId: string;
  judges: Judge[];
  setJudges: React.Dispatch<React.SetStateAction<Judge[]>>;
  canAdmin: boolean;
}

interface Suggestion {
  user_id: string;
  athlete_name: string;
  display_name: string | null;
}

export function JudgesPanel({ competitionId, judges, setJudges, canAdmin }: JudgesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [adding, setAdding] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [guestName, setGuestName] = useState("");
  const [affiliateGymId, setAffiliateGymId] = useState<string | null>(null);

  // Resolve competition's affiliate gym (if private) so search filters to its members.
  useEffect(() => {
    supabase
      .from("competitions")
      .select("gym_id, visibility")
      .eq("id", competitionId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.visibility === "private" && data?.gym_id) setAffiliateGymId(data.gym_id);
      });
  }, [competitionId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchRegisteredUsers(competitionId, q, affiliateGymId);
        const judgeUserIds = new Set(judges.map((j) => j.user_id).filter(Boolean) as string[]);
        const filtered = results.filter((r) => !judgeUserIds.has(r.user_id));
        setSuggestions(filtered);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      }
      setSearching(false);
    }, 300);
        const filtered = results.filter((r) => !judgeUserIds.has(r.user_id));
        setSuggestions(filtered);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      }
      setSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, competitionId, judges]);

  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    setAdding(true);
    setShowDropdown(false);
    try {
      const judge = await addJudge(competitionId, suggestion.user_id);
      judge.display_name = suggestion.athlete_name || suggestion.display_name || undefined;
      setJudges((prev) => [...prev, judge]);
      setSearchQuery("");
      setSuggestions([]);
      toast.success(`Judge added: ${suggestion.athlete_name}`);
    } catch {
      toast.error("Failed to add judge");
    }
    setAdding(false);
  };

  const handleRemove = async (judgeId: string) => {
    try {
      await removeJudge(judgeId);
      setJudges((prev) => prev.filter((j) => j.id !== judgeId));
    } catch {
      toast.error("Failed to remove judge");
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Gavel className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground uppercase">Judges</h3>
      </div>

      {judges.length === 0 && (
        <p className="text-sm text-muted-foreground mb-4">No judges assigned.</p>
      )}

      <div className="space-y-2 mb-4">
        {judges.map((j) => (
          <div key={j.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-background">
            <span className="font-semibold text-foreground text-sm truncate">
              {j.display_name || j.user_id.slice(0, 8) + "…"}
            </span>
            {canAdmin && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(j.id)} aria-label="Remove judge">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {canAdmin && (
        <div className="relative" ref={wrapperRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search registered athletes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 bg-background text-sm pl-9"
              disabled={adding}
            />
          </div>

          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s.user_id}
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <span className="font-medium">{s.athlete_name}</span>
                </button>
              ))}
            </div>
          )}

          {showDropdown && suggestions.length === 0 && searchQuery.trim().length >= 2 && !searching && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-3">
              <p className="text-xs text-muted-foreground">No registered athletes found matching "{searchQuery}"</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-2">
            Type at least 2 characters to search registered athletes
          </p>
        </div>
      )}
    </div>
  );
}
