import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

export function ShopSpotlight() {
  const navigate = useNavigate();

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
        Shop Spotlight
      </h2>
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="h-32 bg-muted flex items-center justify-center">
          <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <div className="p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">Official Gear</h3>
          <p className="text-xs text-muted-foreground">
            Quality martial arts apparel and equipment — coming soon.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs font-semibold uppercase"
            onClick={() => navigate("/browse")}
          >
            Browse Shop
          </Button>
        </div>
      </div>
    </section>
  );
}
