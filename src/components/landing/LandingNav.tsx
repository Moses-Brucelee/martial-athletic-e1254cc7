import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-runs", label: "How it runs" },
  { href: "#pricing", label: "Pricing" },
];

export function LandingNav() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <img src={logoCompact} alt="Martial Athletic" className="h-9 w-9 object-contain" />
          <span className="hidden text-sm font-bold uppercase tracking-[0.18em] text-foreground sm:inline">
            Martial Athletic
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="h-11 px-3 text-xs font-bold uppercase tracking-widest"
            onClick={() => navigate("/login")}
          >
            Log in
          </Button>
          <Button
            className="h-11 px-4 text-xs font-bold uppercase tracking-widest"
            onClick={() => navigate("/register")}
          >
            Get started
          </Button>
        </div>
      </nav>
    </header>
  );
}
