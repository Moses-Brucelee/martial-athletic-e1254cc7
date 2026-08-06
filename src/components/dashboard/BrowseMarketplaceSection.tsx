import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";

const MARKETPLACE_TABS = [
  { key: "programs", label: "Programs", path: "/programs" },
  { key: "competitions", label: "Competitions", path: "/browse" },
  { key: "apparel", label: "Apparel", path: "/browse" },
  { key: "equipment", label: "Equipment", path: "/browse" },
] as const;

export function BrowseMarketplaceSection() {
  const navigate = useNavigate();

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
        Browse Marketplace
      </h2>
      <div className="rounded-xl bg-card border border-border p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {MARKETPLACE_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant="outline"
              size="sm"
              className="text-xs font-semibold uppercase tracking-wide"
              onClick={() => navigate("/browse")}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <ShoppingBag className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            Marketplace coming soon
          </p>
        </div>
      </div>
    </section>
  );
}
