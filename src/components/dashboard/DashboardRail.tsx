import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, User } from "lucide-react";
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
    <aside className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
        <Avatar className="h-11 w-11 border-2 border-primary/20">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{name}</p>
          {tierLabel && (
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">
              {tierLabel}
            </p>
          )}
        </div>
      </div>

      <nav className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {items.map((item) => {
          const Icon = item.icon ?? User;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className="w-full flex items-center gap-3 px-4 py-3 min-h-[3rem] text-left hover:bg-secondary/60 transition-colors group"
            >
              <Icon className="h-4 w-4 text-primary shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold uppercase tracking-wide text-foreground truncate">
                  {item.label}
                </span>
                {item.description && (
                  <span className="block text-[11px] text-muted-foreground truncate">
                    {item.description}
                  </span>
                )}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
