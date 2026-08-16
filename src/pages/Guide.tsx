import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  BookOpen,
  Trophy,
  Layers,
  Users,
  ClipboardList,
  Dumbbell,
  Gavel,
  GitBranch,
  Play,
  BarChart3,
  Medal,
  RefreshCw,
} from "lucide-react";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/components/AuthProvider";

const sections = [
  {
    id: "getting-started",
    icon: BookOpen,
    title: "Getting Started",
    content: (
      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
        <li><strong className="text-foreground">Sign up</strong> — Create an account with your email and verify it, then fill in your display name, affiliation, date of birth, and gender.</li>
        <li><strong className="text-foreground">Main menu</strong> — Once you're logged in, this is where you find competitions, your profile, and everything else.</li>
      </ul>
    ),
  },
  {
    id: "creating-competition",
    icon: Trophy,
    title: "Creating a Competition",
    content: (
      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
        <li><strong className="text-foreground">Basics</strong> — Name, start/end dates, venue, host gym, and registration deadline.</li>
        <li><strong className="text-foreground">Type</strong> — <em>Tournament</em> runs bracket eliminations; <em>Straightforward</em> just scores workouts.</li>
        <li><strong className="text-foreground">Age categories</strong> — <em>Open</em>, <em>Under X</em> (max age), or an age range (min–max).</li>
        <li><strong className="text-foreground">Templates</strong> — Save a setup as a template, or start a new competition from one.</li>
        <li><strong className="text-foreground">Poster</strong> — Add a poster image so your listing looks good publicly.</li>
        <li>Once created, you land on the competition dashboard to set up workouts, divisions, and teams.</li>
      </ul>
    ),
  },
  {
    id: "dashboard",
    icon: Play,
    title: "Competition Dashboard & Command Center",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>This is where you run everything for your competition.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">Command</strong> — Team count, workout count, score entry progress, and status, at a glance.</li>
          <li><strong className="text-foreground">Tabs</strong> — Command, Setup, Registrations, Judges, Heats, Brackets, Scores, Leaderboard, Roster.</li>
          <li><strong className="text-foreground">Status bar</strong> — Move the competition through Draft → Published → Live → Completed.</li>
          <li><strong className="text-foreground">Who sees what</strong> — Owners get every tab. Judges get Scores, Brackets, Leaderboard, and Roster. Viewers get Leaderboard, Roster, and Overview.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "divisions",
    icon: Layers,
    title: "Understanding Divisions",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>Divisions group teams so competition stays fair — by weight, skill, age, or anything else you choose.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">Examples</strong> — Lightweight, Heavyweight, Beginner, Advanced, Under 18, Masters 40+.</li>
          <li><strong className="text-foreground">Set them up</strong> — Add as many as you need from the Setup tab.</li>
          <li><strong className="text-foreground">Why it matters</strong> — Each division gets its own bracket and its own leaderboard section.</li>
          <li>Create divisions before adding teams — it makes assigning teams much faster.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "teams",
    icon: Users,
    title: "Setting Up Teams",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>A team is whatever competes and gets scored — one athlete or a group.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">Add a team</strong> — In the Setup tab's Teams panel, enter a name and optionally pick a division.</li>
          <li>Each team belongs to one division, which decides its bracket and leaderboard section.</li>
          <li>For solo competitors, just use their name as the team name.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "registrations",
    icon: ClipboardList,
    title: "Registration & Athlete Management",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>Once a competition is published, athletes can register from its public page.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">Review</strong> — The Registrations tab shows totals: registered, approved, waitlisted, and capacity remaining.</li>
          <li><strong className="text-foreground">Statuses</strong> — Pending, approved, waitlisted, rejected, withdrawn, or removed. Move between them with the action buttons.</li>
          <li><strong className="text-foreground">Capacity</strong> — Set a max on the competition or a division. Once it's full, new registrations go to the waitlist automatically.</li>
          <li>If an approved athlete drops out, the next person on the waitlist gets promoted automatically.</li>
          <li><strong className="text-foreground">Bulk actions</strong> — Approve, reject, waitlist, or delete several registrations at once, or export to CSV.</li>
          <li><strong className="text-foreground">CSV import</strong> — Upload a file to register a batch of athletes. You'll preview the data and fix errors before confirming.</li>
          <li>You can also add athletes one at a time with a simple mobile-friendly form.</li>
          <li>Payment status (paid, pending, waived) shows right on each registration.</li>
          <li><strong className="text-foreground">Roster vs Teams</strong> — Teams get scored. Roster is the list of people on each team. Scoring always happens at the team level.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "workouts",
    icon: Dumbbell,
    title: "Configuring Workouts",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>Workouts are the events athletes get scored on.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">How to score it</strong>:
            <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
              <li><em>Time</em> — fastest wins (100m sprint)</li>
              <li><em>Reps</em> — most wins (max pull-ups)</li>
              <li><em>Weight</em> — heaviest wins (deadlift max)</li>
              <li><em>Points</em> — highest wins (judges' scoring)</li>
              <li><em>Distance</em> — longest wins (throw events)</li>
            </ul>
          </li>
          <li>Add as many workouts as you like — the leaderboard adds up scores across all of them.</li>
          <li>Lock a workout once its scores are final so nobody can edit them by accident.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "judges",
    icon: Gavel,
    title: "Judges & Judge Assignments",
    content: (
      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
        <li>Judges enter and update team scores per workout, using a mobile-friendly view.</li>
        <li><strong className="text-foreground">Add a judge</strong> — Search for a registered user by name on the Judges tab.</li>
        <li>For bigger events, assign judges to specific workouts, heats, or lanes.</li>
        <li>Judges can only score. Only the owner can add/remove teams or change competition status.</li>
      </ul>
    ),
  },
  {
    id: "heats",
    icon: RefreshCw,
    title: "Heat Management",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>Heats let you schedule groups of teams to compete at set times.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li>Use them when you have more teams than can compete at once — a track event, or a floor with limited stations.</li>
          <li><strong className="text-foreground">Set up</strong> — Pick a workout in the Heats tab, set lane count, and create heats.</li>
          <li>Assign teams to lanes, then track each heat as scheduled, started, or completed.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "brackets",
    icon: GitBranch,
    title: "Understanding Brackets (Tournament Mode)",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>Brackets pit teams against each other head-to-head, with losers eliminated. Use them for combat sports or any 1v1 format.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li>Generate a bracket per division from the Brackets tab.</li>
          <li>Each bout shows two teams — pick the winner to advance them.</li>
          <li>If the team count isn't a power of 2, some teams get a bye and skip straight to the next round.</li>
          <li>Teams changed before the competition starts? Regenerate the bracket.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "lifecycle",
    icon: RefreshCw,
    title: "Competition Lifecycle (Status Flow)",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <div className="flex flex-wrap gap-2 mb-3">
          {["Draft", "Published", "Live", "Completed", "Expired"].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <span className="px-2.5 py-1 rounded bg-primary/10 text-primary text-xs font-bold uppercase">{s}</span>
              {i < 4 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">Draft</strong> — Set up teams, workouts, divisions, and judges. Nobody else can see it yet.</li>
          <li><strong className="text-foreground">Published</strong> — Athletes can see it and register. Approve or reject sign-ups from the Registrations tab.</li>
          <li><strong className="text-foreground">Live</strong> — Scoring is open. Judges enter scores, heats run, bouts get resolved, and the leaderboard updates as it happens.</li>
          <li><strong className="text-foreground">Completed</strong> — The leaderboard is locked. It stays viewable for 30 days.</li>
          <li><strong className="text-foreground">Expired</strong> — 30 days after the end date, it becomes read-only.</li>
        </ul>
        <div className="bg-muted/30 rounded-lg p-4 border border-border mt-3">
          <p className="text-foreground font-semibold mb-2">Changing status:</p>
          <p>Use the status buttons on the dashboard. Each one asks you to confirm and explains what it changes.</p>
        </div>
      </div>
    ),
  },
  {
    id: "straightforward",
    icon: Play,
    title: "Running a Straightforward Competition (No Brackets)",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>No brackets needed — just workouts, scores, and a leaderboard.</p>
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <p className="text-foreground font-semibold mb-2">Step-by-step:</p>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li>Create your competition with start/end dates and registration deadline</li>
            <li>Add divisions to categorize competitors</li>
            <li>Add teams and assign them to divisions</li>
            <li>Configure workouts with measurement types</li>
            <li><strong className="text-foreground">Publish</strong> — Makes the competition visible and opens registration</li>
            <li>Accept athlete registrations from the Registrations tab</li>
            <li><strong className="text-foreground">Go Live</strong> — Activates scoring</li>
            <li>Have judges enter scores for each team per workout</li>
            <li>View the leaderboard for real-time rankings</li>
            <li><strong className="text-foreground">Complete</strong> — Locks the final leaderboard</li>
          </ol>
        </div>
      </div>
    ),
  },
  {
    id: "scoring",
    icon: BarChart3,
    title: "Scoring",
    content: (
      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
        <li>Enter scores from the Scores tab, one workout at a time — or use the mobile view during a live event.</li>
        <li>The owner can lock a workout once its scores are final. Judges can't edit locked scores; owners and super users still can.</li>
        <li>The leaderboard recalculates instantly whenever a score is saved.</li>
        <li>Ranking is by total points across all workouts. For timed events, faster scores earn more points; for reps, weight, points, or distance, higher scores earn more.</li>
      </ul>
    ),
  },
  {
    id: "leaderboard",
    icon: Medal,
    title: "Leaderboard",
    content: (
      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
        <li>Teams are ranked by total points across all scored workouts.</li>
        <li>Filter by division to see rankings within a category.</li>
        <li>It updates live as scores come in, so spectators see current standings.</li>
        <li>Anyone can view it on the competition page — no account needed.</li>
      </ul>
    ),
  },
  {
    id: "athlete-profiles",
    icon: Users,
    title: "Athlete Profiles & Claiming",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>Athletes can claim and manage their own competition profile.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li>If an organizer registered you, claim your record by matching your email or searching by name on the Performances page.</li>
          <li>Once claimed, update your name, email, phone, gender, and date of birth there too.</li>
          <li>Organizers can merge duplicate athlete records — if both have registrations for the same competition, they'll choose to skip or reassign one.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "performances",
    icon: BarChart3,
    title: "Performances & Competition History",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>Performances is your personal results history.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li>See every competition you've entered, with division, final rank, and total score.</li>
          <li>Click into one for a per-workout breakdown: your score, rank, and points earned.</li>
          <li>Each detail view includes a mini leaderboard so you can see how you stacked up.</li>
        </ul>
      </div>
    ),
  },
];
export default function Guide() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const backPath = user ? "/dashboard" : "/";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sections.map((s) => ({
      "@type": "Question",
      name: s.title,
      acceptedAnswer: {
        "@type": "Answer",
        text: `Learn about ${s.title.toLowerCase()} on Martial Athletic — see the platform guide for full step-by-step details.`,
      },
    })),
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <SEO
        title="Platform Guide – How Martial Athletic Works"
        description="Step-by-step guide to running competitions on Martial Athletic: divisions, teams, registration, workouts, judging, brackets, and scoring."
        path="/guide"
        jsonLd={faqJsonLd}
      />
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <img src={logoCompact} alt="Martial Athletic" className="w-10 h-10 object-contain" />
          <span className="text-lg font-bold text-foreground tracking-tight uppercase">Platform Guide</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">How to Use the Platform</h1>
          <p className="text-muted-foreground">
            Everything you need to know about setting up and running competitions — from divisions and teams to brackets and scoring.
          </p>
        </div>

        <Accordion type="multiple" className="space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <AccordionItem key={section.id} value={section.id} className="border border-border rounded-xl px-4 bg-card">
                <AccordionTrigger className="hover:no-underline gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-bold tracking-wide uppercase text-foreground">{section.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">{section.content}</AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <div className="mt-10 text-center">
          <Button variant="outline" onClick={() => navigate(backPath)}>
            {user ? "Back to Menu" : "Back to Home"}
          </Button>
        </div>
      </main>
    </div>
  );
}
