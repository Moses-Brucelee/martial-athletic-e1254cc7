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

        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-5">
          <span className="h-px w-8 bg-border" />
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground">
            Est. 2025 · Competition Platform
          </span>
          <span className="h-px w-8 bg-border" />
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground text-center tracking-tight leading-[1.05] max-w-3xl uppercase">
          Train Harder.{" "}
          <span className="relative inline-block text-primary">
            Compete
            <span className="absolute left-0 right-0 -bottom-1 h-[3px] bg-primary/70 rounded-full" />
          </span>{" "}
          Smarter.
        </h1>
        <p className="mt-5 sm:mt-6 text-muted-foreground text-base sm:text-lg text-center max-w-2xl leading-relaxed">
          Create, share, and sell workout programs. Build competitions.
          Push your limits with the ultimate fitness platform.
        </p>

        {/* Primary CTAs */}
        <div className="mt-9 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md sm:max-w-lg">
          <Button
            size="lg"
            className="group relative w-full sm:w-1/2 h-14 text-base font-bold tracking-wider uppercase bg-gradient-to-r from-primary to-[hsl(14_85%_55%)] text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-primary/40 transition-all hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] hover:ring-primary/60"
            onClick={() => navigate("/register")}
          >
            Get Started
            <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-1/2 h-14 text-base font-bold tracking-wider uppercase border-border/80 bg-transparent hover:bg-foreground/5 hover:border-foreground/40 transition-all hover:scale-[1.02]"
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

        {/* Trust strip */}
        <div className="mt-12 sm:mt-14 w-full max-w-3xl">
          <div className="flex items-center gap-4">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] sm:text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground/80">
              Built for Gyms · Affiliates · Athletes
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>

        {/* Feature bento grid */}
        <div className="mt-8 sm:mt-10 grid grid-cols-2 md:grid-cols-3 md:grid-rows-2 gap-3 sm:gap-4 w-full max-w-3xl">
          {/* Tall feature */}
          <div className="md:col-span-1 md:row-span-2 relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-card to-card/40 p-5 sm:p-6 hover:border-primary/40 transition-all group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col h-full min-h-[180px] justify-between">
              <div className="w-12 h-12 rounded-xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground uppercase tracking-wide">Competitions</h3>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Live leaderboards, brackets, and judging — built for events of any scale.
                </p>
              </div>
            </div>
          </div>

          {/* Compact tiles */}
          {[
            { icon: Dumbbell, label: "Programs", desc: "Build & share" },
            { icon: Users, label: "Community", desc: "Connect & grow" },
            { icon: Zap, label: "Overload", desc: "Progressive training" },
          ].map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="relative rounded-2xl border border-border bg-card p-4 sm:p-5 hover:border-primary/40 transition-all group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex flex-col">
                <div className="w-10 h-10 rounded-lg bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-bold text-foreground uppercase tracking-wide">{label}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{desc}</span>
              </div>
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
