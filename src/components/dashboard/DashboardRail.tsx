import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface RailItem {
  id: string;
  label: string;
  description: string | null;
  icon: LucideIcon;
  onClick: () => void;
}

interface DashboardRailProps {
  name: string;
  initials: string;
  avatarUrl?: string | null;
  tierLabel?: string;
  items: RailItem[];
}

export function DashboardRail({ name, initials, avatarUrl, tierLabel, items }: DashboardRailProps) {
  return (
    <aside className="space-y-4">
      <div className="border-l-2 border-primary bg-card px-4 py-4 flex items-center gap-3">
        <Avatar className="h-12 w-12 rounded-none border border-border">
          <AvatarImage src={avatarUrl || undefined} className="rounded-none" />
          <AvatarFallback className="rounded-none bg-secondary text-primary text-sm font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-base font-bold uppercase tracking-tight text-foreground truncate leading-tight">
            {name}
          </p>
          {tierLabel && (
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground truncate">
              {tierLabel}
            </p>
          )}
        </div>
      </div>

      <nav className="border-t border-border">
        {items.map((item, idx) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className="w-full flex items-baseline gap-3 px-1 py-3.5 min-h-[3.25rem] text-left border-b border-border hover:bg-secondary/50 hover:px-3 transition-all group"
          >
            <span className="text-[11px] font-bold tabular-nums text-primary/60 group-hover:text-primary transition-colors w-5 shrink-0">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-bold uppercase tracking-wide text-foreground truncate">
                {item.label}
              </span>
              {item.description && (
                <span className="block text-[11px] text-muted-foreground truncate mt-0.5">
                  {item.description}
                </span>
              )}
            </span>
            <span className="text-muted-foreground/30 group-hover:text-primary transition-colors text-sm shrink-0">
              /
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
