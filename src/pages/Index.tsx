import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import logoWide from "@/assets/martial-athletic-logo-wide.png";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";
import { SEO } from "@/components/SEO";
import { LandingNav } from "@/components/landing/LandingNav";
import { useLandingStats } from "@/components/landing/useLandingData";
import { LiveLeaderboardSim } from "@/components/landing/LiveLeaderboardSim";
import { RoleSwitcher } from "@/components/landing/RoleSwitcher";
import { useUpcomingCompetitions } from "@/components/dashboard/useUpcomingCompetitions";

const FAQ = [
  { q: "Can I run a private competition?", a: "Yes. Events stay in draft until you publish them, and only people you invite can see a draft." },
  { q: "What if the venue Wi-Fi is bad?", a: "Judges enter scores on their phones. Each score is a small request, so a weak mobile signal is usually enough." },
  { q: "Do judges need an account?", a: "No. You can type a judge's name in manually. If they already have an account at your gym, it shows up after three letters." },
  { q: "How are ties broken?", a: "You choose per competition: no tie breaker, or most wins then top placements. Workouts can have their own tie breaker too." },
  { q: "Can athletes register as a team?", a: "Yes, if the division's team size is more than one. A team can register with just a name and fill the roster later." },
  { q: "Who can see my athletes' data?", a: "Profiles are visible to signed-in members for discovery. Scores and registrations follow the event's visibility settings." },
];

const Eyebrow = ({ children, accent }: { children: string; accent?: boolean }) => (
  <p className={`flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.3em] ${accent ? "text-accent" : "text-primary"}`}>
    <span className={`h-px w-6 ${accent ? "bg-accent" : "bg-primary"}`} />
    {children}
  </p>
);

const Index = () => {
  const navigate = useNavigate();
  const stats = useLandingStats();
  const { data: events = [] } = useUpcomingCompetitions(6);

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
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-4 pb-16 pt-14 text-center sm:px-6 sm:pt-20">
            <img src={logoCompact} alt="Martial Athletic seal" className="w-28 drop-shadow-2xl sm:w-36" />
            <Eyebrow>Where the FITNESS Industry CONVERGE.</Eyebrow>
            <h1 className="mt-5 text-4xl font-bold uppercase leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Where the <span className="text-primary">fitness</span> world meets on game day
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Host the event, score it from the floor and put the results on the big screen. Athletes, judges and gyms work from the same board.
            </p>
            <div className="mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <Button size="lg" className="group h-14 flex-1 text-base font-bold uppercase tracking-wider shadow-lg shadow-primary/25" onClick={() => navigate("/register")}>
                Host a competition
                <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 flex-1 text-base font-bold uppercase tracking-wider" asChild>
                <a href="#live">Try the live demo</a>
              </Button>
            </div>
          </div>
        </section>

        {stats.length > 0 && (
          <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className={`grid grid-cols-2 divide-border rounded-lg border border-border bg-card sm:divide-x ${stats.length >= 4 ? "sm:grid-cols-4" : stats.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {stats.map((s) => (
                <div key={s.label} className="px-5 py-6 sm:px-7">
                  <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">{s.value}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Live demo */}
        <section id="live" className="mx-auto grid w-full max-w-6xl scroll-mt-20 items-start gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Eyebrow accent>Live demo</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold uppercase leading-[1.05] tracking-tight text-foreground sm:text-5xl">Watch the board move.</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              This is what your crowd sees. Every score a judge enters re-ranks the board within seconds. Flip on venue screen to see how it reads on a gym TV.
            </p>
          </div>
          <LiveLeaderboardSim />
        </section>

        {/* Events */}
        {events.length > 0 && (
          <section id="events" className="scroll-mt-20 border-y border-border bg-card/40">
            <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <Eyebrow>Competitions</Eyebrow>
                  <h2 className="mt-4 text-3xl font-bold uppercase tracking-tight text-foreground sm:text-4xl">On the calendar</h2>
                </div>
                <Button variant="ghost" className="h-11 text-xs font-bold uppercase tracking-widest" onClick={() => navigate("/browse")}>
                  See all <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="mt-8 flex snap-x gap-4 overflow-x-auto pb-2">
                {events.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => navigate(`/event/${e.id}`)}
                    className="group w-[260px] shrink-0 snap-start overflow-hidden rounded-lg border border-border bg-card text-left transition-all hover:-translate-y-1 hover:border-primary/60"
                  >
                    <div className="aspect-video bg-muted">
                      {e.poster_url ? (
                        <img src={e.poster_url} alt={e.name} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/40 to-background text-2xl font-bold uppercase text-foreground/80">
                          {e.name.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="truncate font-bold uppercase tracking-tight text-foreground group-hover:text-primary">{e.name}</div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {e.date ? new Date(e.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Date to be set"}
                      </div>
                      {e.venue && (
                        <div className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{e.venue}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Roles */}
        <section id="roles" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
          <Eyebrow>Features</Eyebrow>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold uppercase leading-[1.05] tracking-tight text-foreground sm:text-5xl">Pick your side of the floor.</h2>
          <div className="mt-10">
            <RoleSwitcher />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-border bg-card/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <Eyebrow accent>FAQ</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold uppercase tracking-tight text-foreground sm:text-5xl">Questions hosts ask</h2>
            <div className="mt-10 grid gap-x-10 md:grid-cols-2">
              {[FAQ.slice(0, 3), FAQ.slice(3)].map((col, ci) => (
                <Accordion key={ci} type="single" collapsible>
                  {col.map((f) => (
                    <AccordionItem key={f.q} value={f.q}>
                      <AccordionTrigger className="min-h-[48px] text-left text-sm font-bold uppercase tracking-wide">{f.q}</AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ))}
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="flex flex-col items-start gap-6 rounded-lg border border-primary/40 bg-card p-7 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold uppercase leading-tight tracking-tight text-foreground sm:text-4xl">Put your next event on the board.</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Set up an account, build the event, and share the link. Registration can open the same day.</p>
            </div>
            <Button size="lg" className="h-14 w-full text-base font-bold uppercase tracking-wider lg:w-auto lg:px-10" onClick={() => navigate("/register")}>
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
