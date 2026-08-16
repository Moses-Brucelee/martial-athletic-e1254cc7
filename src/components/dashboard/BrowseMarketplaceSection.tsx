import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const MARKETPLACE_TABS = [
  { key: "programs", label: "Programs", path: "/programs", live: true },
  { key: "competitions", label: "Competitions", path: "/browse", live: true },
  { key: "apparel", label: "Apparel", path: "/browse", live: false },
  { key: "equipment", label: "Equipment", path: "/browse", live: false },
] as const;

export function BrowseMarketplaceSection() {
  const navigate = useNavigate();

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground">
        Marketplace
      </h2>
      <div className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {MARKETPLACE_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant="outline"
              size="sm"
              className="text-[11px] font-semibold uppercase tracking-wide min-h-[2.5rem] sm:min-h-0"
              onClick={() => navigate(tab.path)}
            >
              {tab.label}
              {!tab.live && (
                <span className="ml-2 text-[9px] text-muted-foreground normal-case">soon</span>
              )}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Gear and apparel open later this year.
        </p>
      </div>
    </section>
  );
}
