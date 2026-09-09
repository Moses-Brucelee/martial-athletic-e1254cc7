import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import logoWide from "@/assets/martial-athletic-logo-wide.png";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";
import { SEO } from "@/components/SEO";
import { LandingNav } from "@/components/landing/LandingNav";
import { PricingSection } from "@/components/landing/PricingSection";
import { useLandingStats } from "@/components/landing/useLandingData";

const FEATURES = [
  {
    title: "Run the whole event in one place",
    body: "Divisions, workouts, registrations, heats and lanes. No spreadsheet passed between five people on the day.",
  },
  {
    title: "Scores go in from the floor",
    body: "Judges enter results on their phones. The leaderboard updates while the heat is still running.",
  },
  {
    title: "Athletes find you",
    body: "Every published event gets a public page with the workouts, the schedule and your sponsors on it.",
  },
];

const STEPS = [
  { n: "01", title: "Build the event", body: "Set the dates, divisions and workouts in the wizard." },
  { n: "02", title: "Open registration", body: "Share one link. Teams and solo athletes sign themselves up." },
  { n: "03", title: "Score it live", body: "Judges submit from the floor, you lock scores when they're final." },
  { n: "04", title: "Publish results", body: "Leaderboard and heat sheets go out as a screen or a download." },
];

const Index = () => {
  const navigate = useNavigate();
  const stats = useLandingStats();

  return (
    <div id="top" className="min-h-dvh bg-background">
      <SEO
        title="Martial Athletic – Train Harder, Compete Smarter"
        description="Premium fitness platform to create programs, run competitions, and track leaderboards. Built for gyms, affiliates, and athletes."
        path="/"
      />

      <LandingNav />

      <main>
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
              <span className="h-px w-6 bg-primary" />
              Built for gyms, run by athletes
            </p>
            <h1 className="mt-6 text-4xl font-bold uppercase leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Train Harder.
              <br />
              <span className="text-primary">Compete Smarter.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Host a competition, run the scoring, and keep your training programs in the same place your
              athletes already are.
            </p>

            <div className="mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="group h-14 flex-1 text-base font-bold uppercase tracking-wider shadow-lg shadow-primary/25"
                onClick={() => navigate("/register")}
              >
                Get started
                <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 flex-1 text-base font-bold uppercase tracking-wider"
                onClick={() => navigate("/browse")}
              >
                Browse events
              </Button>
            </div>

            <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Free to join ·{" "}
              <button onClick={() => navigate("/tutorial")} className="underline hover:text-foreground">
                See how it works
              </button>
            </p>
          </div>

          <div className="order-first flex justify-center lg:order-none">
            <img
              src={logoCompact}
              alt="Martial Athletic seal"
              className="w-44 max-w-full drop-shadow-2xl sm:w-64 lg:w-full lg:max-w-[380px]"
            />
          </div>
        </section>

        {/* Numbers */}
        {stats.length > 0 && (
          <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div
              className={`grid grid-cols-2 divide-border rounded-lg border border-border bg-card sm:divide-x ${
                stats.length >= 4 ? "sm:grid-cols-4" : stats.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
              }`}
            >
              {stats.map((s) => (
                <div key={s.label} className="px-5 py-6 sm:px-7">
                  <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
                    {s.value}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Features */}
        <section id="features" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-primary">
            <span className="h-px w-6 bg-primary" />
            What you get
          </p>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold uppercase leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            Everything a competition day needs.
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50 sm:p-7"
              >
                <span className="text-xs font-bold tabular-nums tracking-[0.2em] text-primary">
                  0{i + 1}
                </span>
                <h3 className="mt-4 text-lg font-bold uppercase leading-snug tracking-tight text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it runs */}
        <section id="how-it-runs" className="border-y border-border bg-card/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] text-accent">
              <span className="h-px w-6 bg-accent" />
              How it runs
            </p>
            <h2 className="mt-4 max-w-2xl text-3xl font-bold uppercase leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              From first draft to final standings.
            </h2>

            <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <li key={s.n} className="bg-background p-6 sm:p-7">
                  <span className="text-3xl font-bold tabular-nums tracking-tight text-muted-foreground/40">
                    {s.n}
                  </span>
                  <h3 className="mt-3 text-sm font-bold uppercase tracking-wide text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <PricingSection />

        {/* Closing */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
          <div className="flex flex-col items-start gap-6 rounded-lg border border-primary/40 bg-card p-7 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold uppercase leading-tight tracking-tight text-foreground sm:text-4xl">
                Put your next event on the board.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Set up an account, build the event, and share the link. Registration can open the same day.
              </p>
            </div>
            <Button
              size="lg"
              className="h-14 w-full text-base font-bold uppercase tracking-wider lg:w-auto lg:px-10"
              onClick={() => navigate("/register")}
            >
              Get started
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <img src={logoWide} alt="Martial Athletic" className="h-7 w-auto object-contain" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Est. 2025</span>
          </div>
          <div className="flex flex-wrap justify-center gap-5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <button onClick={() => navigate("/guide")} className="hover:text-foreground">Guide</button>
            <button onClick={() => navigate("/browse")} className="hover:text-foreground">Browse</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground">Privacy</button>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground">Terms</button>
            <button onClick={() => navigate("/login")} className="hover:text-foreground">Sign in</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
