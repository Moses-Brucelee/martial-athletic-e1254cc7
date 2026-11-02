import { useNavigate } from "react-router-dom";
import { SectionHeading } from "./SectionHeading";
import { MARKETPLACE_LAUNCHED } from "@/components/marketplace/ComingSoonOverlay";

const MARKETPLACE_TABS = [
  { key: "programs", label: "Programs", path: "/programs", live: MARKETPLACE_LAUNCHED.programs },
  { key: "competitions", label: "Competitions", path: "/browse", live: true },
  { key: "apparel", label: "Apparel", path: "/browse", live: MARKETPLACE_LAUNCHED.apparel },
  { key: "equipment", label: "Equipment", path: "/browse", live: MARKETPLACE_LAUNCHED.equipment },
] as const;

export function BrowseMarketplaceSection() {
  const navigate = useNavigate();

  return (
    <section className="space-y-4">
      <SectionHeading index="03" title="Marketplace" note="Programs, gear and apparel are on the way" />
      <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-l border-border">
        {MARKETPLACE_TABS.map((tab) =>
          tab.live ? (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate(tab.path)}
              className="border-b border-r border-border px-4 py-5 text-left hover:bg-secondary/60 transition-colors group min-h-[4.5rem]"
            >
              <span className="block text-sm font-bold uppercase tracking-wide text-foreground group-hover:text-primary transition-colors">
                {tab.label}
              </span>
              <span className="block text-[11px] text-muted-foreground mt-1">Browse now</span>
            </button>
          ) : (
            <div
              key={tab.key}
              aria-disabled="true"
              className="relative border-b border-r border-border px-4 py-5 min-h-[4.5rem] cursor-not-allowed"
            >
              <span className="block text-sm font-bold uppercase tracking-wide text-muted-foreground">{tab.label}</span>
              <span className="mt-1 inline-block bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                Coming soon
              </span>
            </div>
          ),
        )}
      </div>
    </section>
  );
}
