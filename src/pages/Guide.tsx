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

const sections = [
  {
    id: "getting-started",
    icon: BookOpen,
    title: "Getting Started",
    content: (
      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
        <li><strong className="text-foreground">Create your account</strong> — Sign up with your email and verify it. You'll be prompted to create a profile with your display name, affiliation, date of birth, and gender.</li>
        <li><strong className="text-foreground">Navigate the Main Menu</strong> — After logging in, the main menu gives you quick access to competitions, your profile, and platform features.</li>
        <li><strong className="text-foreground">Understand your tier</strong> — Free users can view competitions. Upgraded tiers unlock competition creation, gym management, and more. Check the Upgrade page for details.</li>
      </ul>
    ),
  },
  {
    id: "creating-competition",
    icon: Trophy,
    title: "Creating a Competition",
    content: (
      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
        <li><strong className="text-foreground">Required fields</strong> — Name your competition, set the date, venue, and host gym.</li>
        <li><strong className="text-foreground">Competition type</strong> — Choose between <em>Tournament</em> (bracket-based elimination) or <em>Straightforward</em> (workout scoring only).</li>
        <li><strong className="text-foreground">Age categories</strong> — Set to <em>Open</em> (no age restriction), <em>Under X</em> (maximum age), or <em>Age Range</em> (min–max).</li>
        <li><strong className="text-foreground">After creation</strong> — You'll be redirected to the workout setup page to configure your events.</li>
      </ul>
    ),
  },
  {
    id: "divisions",
    icon: Layers,
    title: "Understanding Divisions",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>Divisions are <strong className="text-foreground">categories</strong> that group teams for fair competition. They can represent weight classes, skill levels, age groups, or any custom grouping.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">Examples</strong> — "Lightweight", "Heavyweight", "Beginner", "Advanced", "Under 18", "Masters 40+"</li>
          <li><strong className="text-foreground">Creating divisions</strong> — Go to the Divisions tab in your competition dashboard and add as many as needed.</li>
          <li><strong className="text-foreground">Impact</strong> — Divisions affect team grouping, bracket generation (one bracket per division), and leaderboard filtering.</li>
          <li><strong className="text-foreground">Best practice</strong> — Create divisions before adding teams so you can assign teams to divisions right away.</li>
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
        <p>Teams are the <strong className="text-foreground">competing units</strong> in your competition. A team can be a single individual or a group of athletes.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">Creating a team</strong> — Go to the Teams tab, enter a team name, and optionally assign it to a division.</li>
          <li><strong className="text-foreground">Division assignment</strong> — Each team can belong to one division. This determines which bracket they compete in and which leaderboard section shows their scores.</li>
          <li><strong className="text-foreground">Naming tips</strong> — Use clear, unique names. For individual competitors, use their name or nickname as the team name.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "roster",
    icon: ClipboardList,
    title: "Managing the Roster (Participants)",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>The <strong className="text-foreground">roster</strong> (Participants tab) lists individual athletes within each team.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">Admin adds athletes</strong> — Competition owners can manually add athletes to any team by entering their name.</li>
          <li><strong className="text-foreground">Self-registration</strong> — When the competition status moves to "Registration", athletes can register themselves and request to join a team.</li>
          <li><strong className="text-foreground">Teams vs Roster</strong> — Think of <em>Teams</em> as the competing unit that gets scored, and the <em>Roster</em> as the individual people on that team. Scores are entered per team, not per individual.</li>
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
        <p>Workouts are the <strong className="text-foreground">scored events or challenges</strong> in your competition.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">Measurement types</strong> — Choose how each workout is scored:
            <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
              <li><em>Time</em> — fastest time wins (e.g., 100m sprint)</li>
              <li><em>Reps</em> — most reps wins (e.g., max pull-ups)</li>
              <li><em>Weight</em> — heaviest lift wins (e.g., deadlift max)</li>
              <li><em>Points</em> — highest points wins (e.g., judges' scoring)</li>
              <li><em>Distance</em> — longest distance wins (e.g., throw events)</li>
            </ul>
          </li>
          <li><strong className="text-foreground">Multiple workouts</strong> — Add as many workouts as needed. The leaderboard aggregates scores across all workouts.</li>
          <li><strong className="text-foreground">Locking</strong> — Once scores are finalized for a workout, it can be locked to prevent further edits.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "judges",
    icon: Gavel,
    title: "Adding Judges",
    content: (
      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
        <li><strong className="text-foreground">What judges do</strong> — Judges can enter and update scores for teams on each workout. They use a mobile-friendly scoring view.</li>
        <li><strong className="text-foreground">Adding a judge</strong> — Go to the Judges tab and search for a registered user by name. Once added, they'll have access to score the competition.</li>
        <li><strong className="text-foreground">Judge vs Owner</strong> — The competition owner has full control (add/remove teams, change status, etc.). Judges can only enter scores.</li>
        <li><strong className="text-foreground">Mobile scoring</strong> — Judges get a simplified mobile view showing one team/workout at a time for quick score entry during live events.</li>
      </ul>
    ),
  },
  {
    id: "brackets",
    icon: GitBranch,
    title: "Understanding Brackets (Tournament Mode)",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>Brackets provide <strong className="text-foreground">elimination-style matchups</strong> between teams. Use brackets for tournament-style competitions where teams face off head-to-head.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">When to use</strong> — Use brackets for combat sports, 1v1 challenges, or any format where teams are eliminated through direct matchups.</li>
          <li><strong className="text-foreground">Generation</strong> — Brackets are auto-generated per division. Move competition status to "Seeding" and the system creates single-elimination brackets.</li>
          <li><strong className="text-foreground">Managing bouts</strong> — Each matchup (bout) shows two teams. Set the winner to advance them to the next round.</li>
          <li><strong className="text-foreground">Byes</strong> — If the number of teams isn't a power of 2, some teams receive automatic byes (advance without competing).</li>
          <li><strong className="text-foreground">Regenerating</strong> — If teams change before the competition starts, you can regenerate brackets.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "straightforward",
    icon: Play,
    title: "Running a Straightforward Competition (No Brackets)",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>For competitions that don't need elimination brackets — just workouts, scores, and a leaderboard.</p>
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <p className="text-foreground font-semibold mb-2">Step-by-step:</p>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li>Create your competition (choose any type)</li>
            <li>Add divisions to categorize competitors</li>
            <li>Add teams and assign them to divisions</li>
            <li>Configure workouts with measurement types</li>
            <li>Move status to <em>Registration</em> to let athletes join</li>
            <li>Skip <em>Seeding</em> — move directly to <em>In Progress</em></li>
            <li>Have judges enter scores for each team per workout</li>
            <li>View the leaderboard for real-time rankings</li>
            <li>Move to <em>Completed</em> when done</li>
          </ol>
        </div>
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
          {["Draft", "Registration", "Seeding", "In Progress", "Completed"].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <span className="px-2.5 py-1 rounded bg-primary/10 text-primary text-xs font-bold uppercase">{s}</span>
              {i < 4 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">Draft</strong> — Set up teams, workouts, and divisions. No athletes can register yet.</li>
          <li><strong className="text-foreground">Registration</strong> — Athletes can self-register and join teams. Requires at least 1 team and 1 workout.</li>
          <li><strong className="text-foreground">Seeding</strong> — Generate brackets (tournament mode). Skip this stage for straightforward competitions by advancing directly to In Progress.</li>
          <li><strong className="text-foreground">In Progress</strong> — Scoring is live. Judges enter scores and bracket bouts are resolved.</li>
          <li><strong className="text-foreground">Completed</strong> — Final leaderboard is locked. No more score changes.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "scoring",
    icon: BarChart3,
    title: "Scoring",
    content: (
      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
        <li><strong className="text-foreground">Entering scores</strong> — Navigate to the Scores tab. Select a workout and enter each team's score. Judges can also use the mobile scoring view.</li>
        <li><strong className="text-foreground">Score locking</strong> — Once scores are finalized for a workout, the owner can lock it. Locked scores cannot be edited by judges (owners can still override).</li>
        <li><strong className="text-foreground">Leaderboard calculation</strong> — Teams are ranked by total points across all workouts. Lower scores in time-based events earn more points; higher scores in reps/weight/points/distance earn more.</li>
      </ul>
    ),
  },
  {
    id: "leaderboard",
    icon: Medal,
    title: "Leaderboard",
    content: (
      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
        <li><strong className="text-foreground">Rankings</strong> — Teams are ranked by total accumulated points across all scored workouts.</li>
        <li><strong className="text-foreground">Division filtering</strong> — Filter the leaderboard by division to see rankings within specific categories.</li>
        <li><strong className="text-foreground">Real-time updates</strong> — The leaderboard updates as scores are entered, giving spectators and participants live standings.</li>
      </ul>
    ),
  },
];

export default function Guide() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
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
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Menu
          </Button>
        </div>
      </main>
    </div>
  );
}
