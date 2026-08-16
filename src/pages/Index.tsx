import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Dumbbell, Trophy, Users, Zap } from "lucide-react";
import logoWide from "@/assets/martial-athletic-logo-wide.png";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";
import { SEO } from "@/components/SEO";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <SEO
        title="Martial Athletic – Train Harder, Compete Smarter"
        description="Premium fitness platform to create programs, run competitions, and track leaderboards. Built for gyms, affiliates, and athletes."
        path="/"
      />

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center px-4 pt-12 sm:pt-16 pb-10">
        {/* Logo */}
        <div className="mb-6 sm:mb-8">
          <img
            src={logoCompact}
            alt="Martial Athletic logo"
            className="w-32 h-auto mx-auto drop-shadow-2xl sm:hidden"
          />
          <img
            src={logoWide}
            alt="Martial Athletic logo"
            className="hidden sm:block sm:w-72 md:w-80 h-auto mx-auto drop-shadow-2xl"
          />
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground text-center tracking-tight leading-[1.05] max-w-3xl uppercase">
          Train Harder. <span className="text-primary">Compete Smarter.</span>
        </h1>
        <p className="mt-5 sm:mt-6 text-muted-foreground text-base sm:text-lg text-center max-w-2xl leading-relaxed">
          Create, share, and sell workout programs. Build competitions.
          Push your limits with the ultimate fitness platform.
        </p>

        {/* Primary CTAs */}
        <div className="mt-9 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md sm:max-w-lg">
          <Button
            size="lg"
            className="group w-full sm:w-1/2 h-14 text-base font-bold tracking-wider uppercase bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all"
            onClick={() => navigate("/register")}
          >
            Get Started
            <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-1/2 h-14 text-base font-bold tracking-wider uppercase border-border/80 bg-transparent hover:bg-foreground/5"
            onClick={() => navigate("/login")}
          >
            Log In
          </Button>
        </div>

        {/* Secondary CTAs */}
        <div className="mt-5 flex gap-6">
          <button
            onClick={() => navigate("/browse")}
            className="text-sm text-muted-foreground hover:text-accent transition-colors font-medium"
          >
            Browse as Guest
          </button>
          <span className="text-border">|</span>
          <button
            onClick={() => navigate("/tutorial")}
            className="text-sm text-muted-foreground hover:text-accent transition-colors font-medium"
          >
            How It Works
          </button>
        </div>

        {/* Feature cards */}
        <div className="mt-10 sm:mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full max-w-4xl">
          {[
            { icon: Dumbbell, label: "Workout Programs", desc: "Build & share" },
            { icon: Trophy, label: "Competitions", desc: "Leaderboards & events" },
            { icon: Users, label: "Community", desc: "Connect & grow" },
            { icon: Zap, label: "Overload Tool", desc: "Progressive training" },
          ].map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="relative rounded-2xl border border-border bg-card p-4 sm:p-5 hover:border-primary/40 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-bold text-foreground">{label}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </main>


      {/* Footer */}
      <footer className="pb-6 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="h-px w-16 bg-primary/60 mx-auto mb-4" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
            <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase font-semibold">
              Martial Athletic · Est. 2025
            </p>
            <div className="flex gap-5 text-xs text-muted-foreground">
              <button onClick={() => navigate("/guide")} className="hover:text-foreground transition-colors uppercase tracking-wider">
                Guide
              </button>
              <button onClick={() => navigate("/browse")} className="hover:text-foreground transition-colors uppercase tracking-wider">
                Browse
              </button>
              <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors uppercase tracking-wider">
                Privacy
              </button>
              <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors uppercase tracking-wider">
                Terms
              </button>
              <button onClick={() => navigate("/login")} className="hover:text-foreground transition-colors uppercase tracking-wider">
                Sign In
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
