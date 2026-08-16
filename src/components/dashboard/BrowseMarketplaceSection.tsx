import { useNavigate } from "react-router-dom";
import { SectionHeading } from "./SectionHeading";

const MARKETPLACE_TABS = [
  { key: "programs", label: "Programs", path: "/programs", live: true },
  { key: "competitions", label: "Competitions", path: "/browse", live: true },
  { key: "apparel", label: "Apparel", path: "/browse", live: false },
  { key: "equipment", label: "Equipment", path: "/browse", live: false },
] as const;

export function BrowseMarketplaceSection() {
  const navigate = useNavigate();

  return (
    <section className="space-y-4">
      <SectionHeading index="03" title="Marketplace" note="Gear and apparel open later this year" />
      <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-l border-border">
        {MARKETPLACE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => navigate(tab.path)}
            className="border-b border-r border-border px-4 py-5 text-left hover:bg-secondary/60 transition-colors group min-h-[4.5rem]"
          >
            <span className="block text-sm font-bold uppercase tracking-wide text-foreground group-hover:text-primary transition-colors">
              {tab.label}
            </span>
            <span className="block text-[11px] text-muted-foreground mt-1">
              {tab.live ? "Browse now" : "Not open yet"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
