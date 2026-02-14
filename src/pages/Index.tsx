import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Dumbbell, Trophy, Users, Zap } from "lucide-react";
import logoWide from "@/assets/martial-athletic-logo-wide.png";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-20">
        {/* Logo */}
        <div className="mb-8 sm:mb-10">
          <img
            src={logoCompact}
            alt="Martial Athletic logo"
            className="w-36 h-auto mx-auto drop-shadow-2xl sm:hidden"
          />
          <img
            src={logoWide}
            alt="Martial Athletic logo"
            className="hidden sm:block sm:w-80 md:w-96 h-auto mx-auto drop-shadow-2xl"
          />
        </div>

        {/* Tagline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground text-center tracking-tight leading-tight max-w-3xl">
          TRAIN HARDER.{" "}
          <span className="text-primary">COMPETE</span> SMARTER.
        </h1>
        <p className="mt-4 sm:mt-6 text-muted-foreground text-base sm:text-lg md:text-xl text-center max-w-2xl leading-relaxed">
          Create, share, and sell workout programs. Build competitions.
          Push your limits with the ultimate fitness platform.
        </p>

        {/* Primary CTAs */}
        <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row gap-4 w-full max-w-md sm:max-w-lg">
          <Button
            size="lg"
            className="w-full sm:w-1/2 h-14 text-base font-semibold tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]"
            onClick={() => navigate("/register")}
          >
            GET STARTED
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-1/2 h-14 text-base font-semibold tracking-wide border-border hover:bg-secondary hover:text-foreground transition-all hover:scale-[1.02]"
            onClick={() => navigate("/login")}
          >
            LOG IN
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

        {/* Feature Highlights */}
        <div className="mt-16 sm:mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 w-full max-w-3xl">
          {[
            { icon: Dumbbell, label: "Workout Programs", desc: "Build & share" },
            { icon: Trophy, label: "Competitions", desc: "Leaderboards & events" },
            { icon: Users, label: "Community", desc: "Connect & grow" },
            { icon: Zap, label: "Overload Tool", desc: "Progressive training" },
          ].map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex flex-col items-center text-center p-4 sm:p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors group"
            >
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">{label}</span>
              <span className="text-xs text-muted-foreground mt-1">{desc}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer tagline */}
      <footer className="py-6 text-center border-t border-border">
        <p className="text-xs text-muted-foreground tracking-widest uppercase">
          Martial Athletic &middot; Est. 2025
        </p>
      </footer>
    </div>
  );
};

export default Index;
