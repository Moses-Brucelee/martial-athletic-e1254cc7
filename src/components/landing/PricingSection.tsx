import { useNavigate } from "react-router-dom";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLandingTiers } from "./useLandingData";

export function PricingSection() {
  const navigate = useNavigate();
  const tiers = useLandingTiers();

  if (!tiers.length) return null;

  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
        <span className="h-px w-6 bg-primary" />
        Pricing
      </p>
      <h2 className="mt-4 max-w-2xl text-3xl font-bold uppercase leading-[1.05] tracking-tight text-foreground sm:text-5xl">
        Start free. Pay when you host.
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Athletes and judges use the platform at no cost. Gyms pay once they start running their own events.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={cn(
              "flex flex-col rounded-lg border bg-card p-6 sm:p-8",
              tier.is_popular ? "border-primary/70 shadow-lg shadow-primary/10" : "border-border",
            )}
          >
            {tier.is_popular && (
              <span className="mb-4 w-fit bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground">
                Most popular
              </span>
            )}
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
              {tier.name}
            </span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-foreground">{tier.price}</span>
              {tier.period && (
                <span className="text-xs uppercase tracking-widest text-muted-foreground">{tier.period}</span>
              )}
            </div>

            <ul className="mt-7 flex-1 space-y-3">
              {tier.features.map((f) => (
                <li
                  key={f.label}
                  className={cn(
                    "flex items-start gap-2.5 text-sm",
                    f.included ? "text-foreground" : "text-muted-foreground/60",
                  )}
                >
                  {f.included ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  ) : (
                    <Minus className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  {f.label}
                </li>
              ))}
            </ul>

            <Button
              variant={tier.is_popular ? "default" : "outline"}
              className="mt-8 h-12 w-full text-xs font-bold uppercase tracking-widest"
              onClick={() => navigate("/register")}
            >
              Get started
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
