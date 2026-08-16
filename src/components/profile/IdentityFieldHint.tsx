import { Info, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { IDENTITY_LOCK_HINT, IDENTITY_LOCKED_HINT } from "@/lib/profileCompletion";

interface Props {
  locked?: boolean;
}

/**
 * Small "i" (or lock) marker shown next to identity fields that can only be
 * captured once: date of birth, age, gender and full name.
 */
export function IdentityFieldHint({ locked = false }: Props) {
  const text = locked ? IDENTITY_LOCKED_HINT : IDENTITY_LOCK_HINT;
  const Icon = locked ? Lock : Info;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={text}
            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[16rem] text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Read-only display row used for locked identity values. */
export function LockedValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <IdentityFieldHint locked />
      </div>
      <div className="h-11 flex items-center px-3 rounded-md border border-border bg-muted text-foreground">
        {value || <span className="text-muted-foreground">Not set</span>}
      </div>
    </div>
  );
}
