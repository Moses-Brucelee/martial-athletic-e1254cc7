import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus, Search } from "lucide-react";
import { searchJudgeCandidates, type JudgeCandidate } from "@/data/judges";

export interface JudgeSearchSelection {
  userId: string | null;
  displayName: string;
}

interface JudgeSearchInputProps {
  competitionId: string;
  /** user_ids already judging this heat — shown greyed out. */
  assignedUserIds: Set<string>;
  /** lowercase display names already judging this heat. */
  assignedNames: Set<string>;
  disabled?: boolean;
  onSelect: (selection: JudgeSearchSelection) => void | Promise<void>;
}

export function JudgeSearchInput({
  competitionId,
  assignedUserIds,
  assignedNames,
  disabled,
  onSelect,
}: JudgeSearchInputProps) {
  const [value, setValue] = useState("");
  const [results, setResults] = useState<JudgeCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = value.trim();
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    setOpen(true);
    timerRef.current = setTimeout(async () => {
      try {
        setResults(await searchJudgeCandidates(competitionId, q));
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, competitionId]);

  const commit = async (selection: JudgeSearchSelection) => {
    setOpen(false);
    setValue("");
    setResults([]);
    await onSelect(selection);
  };

  const typed = value.trim();
  const firstFree = results.find((r) => !assignedUserIds.has(r.user_id));

  return (
    <div ref={wrapRef} className="relative w-full sm:w-72">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => typed.length >= 3 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter") {
              e.preventDefault();
              if (!typed) return;
              if (firstFree) commit({ userId: firstFree.user_id, displayName: firstFree.display_name });
              else if (!searching) commit({ userId: null, displayName: typed });
            }
          }}
          placeholder="Search or type judge name…"
          className="h-8 text-xs pl-7"
        />
        {searching && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && typed.length >= 3 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {searching && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          )}

          {!searching &&
            results.map((r) => {
              const already = assignedUserIds.has(r.user_id);
              return (
                <button
                  key={r.user_id}
                  type="button"
                  disabled={already}
                  onClick={() => commit({ userId: r.user_id, displayName: r.display_name })}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-xs ${
                    already ? "opacity-50 cursor-not-allowed" : "hover:bg-accent/50"
                  }`}
                >
                  <span className="font-semibold text-foreground truncate">{r.display_name}</span>
                  <span className="text-[9px] uppercase tracking-wide text-muted-foreground shrink-0">
                    {already ? "on this heat" : r.source}
                  </span>
                </button>
              );
            })}

          {!searching && !results.some((r) => r.display_name.toLowerCase() === typed.toLowerCase()) && (
            assignedNames.has(typed.toLowerCase()) ? (
              <div className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
                “{typed}” is already on this heat
              </div>
            ) : (
              <button
                type="button"
                onClick={() => commit({ userId: null, displayName: typed })}
                className="w-full text-left px-3 py-2 flex items-center gap-2 text-xs hover:bg-accent/50 border-t border-border"
              >
                <UserPlus className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-foreground">
                  Add <span className="font-bold">“{typed}”</span> as a guest judge
                </span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
