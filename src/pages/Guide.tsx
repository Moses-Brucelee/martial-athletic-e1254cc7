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

const sections = [
  {
    id: "getting-started",
    icon: BookOpen,
    title: "Getting Started",
    content: (
      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
        <li><strong className="text-foreground">Create your account</strong> — Sign up with your email and verify it. You'll be prompted to create a profile with your display name, affiliation, date of birth, and gender.</li>
        <li><strong className="text-foreground">Navigate the Main Menu</strong> — After logging in, the main menu gives you quick access to competitions, your profile, and platform features.</li>
        <li><strong className="text-foreground">Explore your menu</strong> — The main menu shows everything available to your account. Use it to view competitions, manage your profile, and access platform features.</li>
      </ul>
    ),
  },
  {
    id: "creating-competition",
    icon: Trophy,
    title: "Creating a Competition",
    content: (
      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
        <li><strong className="text-foreground">Required fields</strong> — Name your competition, set the start/end dates, venue, host gym, and registration deadline.</li>
        <li><strong className="text-foreground">Competition type</strong> — Choose between <em>Tournament</em> (bracket-based elimination) or <em>Straightforward</em> (workout scoring only).</li>
        <li><strong className="text-foreground">Age categories</strong> — Set to <em>Open</em> (no age restriction), <em>Under X</em> (maximum age), or <em>Age Range</em> (min–max).</li>
        <li><strong className="text-foreground">Templates</strong> — Save any competition setup as a template for reuse, or start from an existing template when creating a new competition.</li>
        <li><strong className="text-foreground">Poster</strong> — Upload a poster image for your competition from the dashboard to make it visually appealing on public listings.</li>
        <li><strong className="text-foreground">After creation</strong> — You'll be redirected to the competition dashboard where you can configure workouts, divisions, teams, and more.</li>
      </ul>
    ),
  },
  {
    id: "dashboard",
    icon: Play,
    title: "Competition Dashboard & Command Center",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>The competition dashboard is your <strong className="text-foreground">central hub</strong> for managing everything about your competition.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">Command Center</strong> — A quick-glance overview showing team count, workout count, score entry progress, and status — all in one place.</li>
          <li><strong className="text-foreground">Tabs</strong> — The dashboard is organized into tabs: Command, Setup, Registrations, Judges, Heats, Brackets, Scores, Leaderboard, and Roster.</li>
          <li><strong className="text-foreground">Status actions</strong> — Use the status bar to transition your competition through its lifecycle (Draft → Published → Live → Completed).</li>
          <li><strong className="text-foreground">Role-based views</strong> — Owners see all tabs. Judges see Scores, Brackets, Leaderboard, and Roster. Viewers see Leaderboard, Roster, and Overview.</li>
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
        <p>Divisions are <strong className="text-foreground">categories</strong> that group teams for fair competition. They can represent weight classes, skill levels, age groups, or any custom grouping.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">Examples</strong> — "Lightweight", "Heavyweight", "Beginner", "Advanced", "Under 18", "Masters 40+"</li>
          <li><strong className="text-foreground">Creating divisions</strong> — Go to the Setup tab in your competition dashboard and add as many as needed.</li>
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
          <li><strong className="text-foreground">Creating a team</strong> — Go to the Setup tab, find the Teams panel, enter a team name, and optionally assign it to a division.</li>
          <li><strong className="text-foreground">Division assignment</strong> — Each team can belong to one division. This determines which bracket they compete in and which leaderboard section shows their scores.</li>
          <li><strong className="text-foreground">Naming tips</strong> — Use clear, unique names. For individual competitors, use their name or nickname as the team name.</li>
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
        <p>Once your competition is <strong className="text-foreground">published</strong>, athletes can register to participate via the public competition page.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">Public registration</strong> — Share the competition link. Athletes fill in their details and submit a registration request.</li>
          <li><strong className="text-foreground">Reviewing registrations</strong> — Go to the <em>Registrations</em> tab on the dashboard. Summary cards show Total Registered, Approved, Waitlisted, and Capacity Remaining at a glance.</li>
          <li><strong className="text-foreground">Statuses</strong> — Each registration can be <em>pending</em>, <em>approved</em>, <em>waitlisted</em>, <em>rejected</em>, <em>withdrawn</em>, or <em>removed</em>. Use the action buttons to transition between statuses.</li>
          <li><strong className="text-foreground">Capacity limits</strong> — Set <em>max_athletes</em> on the competition or individual divisions. When the approved count reaches the limit, new registrations are automatically waitlisted.</li>
          <li><strong className="text-foreground">Auto-promotion</strong> — When an approved athlete is withdrawn, rejected, or removed, the first waitlisted athlete (ordered by registration date) is automatically promoted to approved.</li>
          <li><strong className="text-foreground">Bulk actions</strong> — Select multiple registrations and approve, reject, waitlist, or delete them in one action. You can also export registrations as CSV.</li>
          <li><strong className="text-foreground">CSV import</strong> — Upload a CSV file to bulk-register athletes. Preview the data, map columns, review validation errors, and confirm. Download a CSV template to get the correct format.</li>
          <li><strong className="text-foreground">Add athlete form</strong> — Use the mobile-optimized form to manually add athletes with name, email, phone, gender, date of birth, division, and team.</li>
          <li><strong className="text-foreground">Deletion</strong> — Organizers can fully remove registration records using the delete/remove action.</li>
          <li><strong className="text-foreground">Payment status</strong> — Payment status badges (paid, pending, waived) are displayed on each registration card and table row.</li>
          <li><strong className="text-foreground">Roster</strong> — The <em>Roster</em> tab shows individual athletes within each team. Owners can also manually add athletes to any team.</li>
          <li><strong className="text-foreground">Teams vs Roster</strong> — <em>Teams</em> are the competing unit that gets scored. The <em>Roster</em> lists the individual people on each team. Scores are entered per team, not per individual.</li>
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
    title: "Judges & Judge Assignments",
    content: (
      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
        <li><strong className="text-foreground">What judges do</strong> — Judges can enter and update scores for teams on each workout. They use a mobile-friendly scoring view.</li>
        <li><strong className="text-foreground">Adding a judge</strong> — Go to the <em>Judges</em> tab and search for a registered user by name. Once added, they'll have access to score the competition.</li>
        <li><strong className="text-foreground">Judge assignments</strong> — Assign judges to specific workouts, heats, or lanes using the Judge Assignment panel for organized scoring during large events.</li>
        <li><strong className="text-foreground">Judge vs Owner</strong> — The competition owner has full control (add/remove teams, change status, etc.). Judges can only enter scores.</li>
        <li><strong className="text-foreground">Mobile scoring</strong> — Judges get a simplified mobile view showing one team/workout at a time for quick score entry during live events.</li>
      </ul>
    ),
  },
  {
    id: "heats",
    icon: RefreshCw,
    title: "Heat Management",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>Heats allow you to <strong className="text-foreground">schedule groups of teams</strong> to compete at specific times during a workout.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">When to use</strong> — Use heats when you have more teams than can compete simultaneously, such as track events or fitness floors with limited stations.</li>
          <li><strong className="text-foreground">Creating heats</strong> — Go to the <em>Heats</em> tab, select a workout, set the number of lanes, and create heats.</li>
          <li><strong className="text-foreground">Lane assignments</strong> — Assign teams to specific lanes within each heat for organized scheduling.</li>
          <li><strong className="text-foreground">Heat status</strong> — Heats can be scheduled, started, or completed to track progress during live events.</li>
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
        <p>Brackets provide <strong className="text-foreground">elimination-style matchups</strong> between teams. Use brackets for tournament-style competitions where teams face off head-to-head.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">When to use</strong> — Use brackets for combat sports, 1v1 challenges, or any format where teams are eliminated through direct matchups.</li>
          <li><strong className="text-foreground">Generation</strong> — Brackets are auto-generated per division from the Brackets tab.</li>
          <li><strong className="text-foreground">Managing bouts</strong> — Each matchup (bout) shows two teams. Set the winner to advance them to the next round.</li>
          <li><strong className="text-foreground">Byes</strong> — If the number of teams isn't a power of 2, some teams receive automatic byes (advance without competing).</li>
          <li><strong className="text-foreground">Regenerating</strong> — If teams change before the competition starts, you can regenerate brackets.</li>
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
          <li><strong className="text-foreground">Draft</strong> — Set up teams, workouts, divisions, and judges. No public visibility yet.</li>
          <li><strong className="text-foreground">Published</strong> — Competition is visible to athletes. Registration is open and athletes can sign up. Use the Registrations tab to accept or reject sign-ups.</li>
          <li><strong className="text-foreground">Live</strong> — Scoring is active. Judges enter scores, heats run, and bracket bouts are resolved. The leaderboard updates in real-time.</li>
          <li><strong className="text-foreground">Completed</strong> — Final leaderboard is locked. No more score changes. The competition remains viewable for 30 days.</li>
          <li><strong className="text-foreground">Expired</strong> — After 30 days past the end date, the competition enters a read-only archived state.</li>
        </ul>
        <div className="bg-muted/30 rounded-lg p-4 border border-border mt-3">
          <p className="text-foreground font-semibold mb-2">Transitioning status:</p>
          <p>Use the status action buttons on the dashboard to manually move your competition through each stage. Each transition includes a confirmation step and description of what changes.</p>
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
        <p>For competitions that don't need elimination brackets — just workouts, scores, and a leaderboard.</p>
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
        <li><strong className="text-foreground">Entering scores</strong> — Navigate to the Scores tab. Select a workout and enter each team's score. Judges can also use the mobile scoring view.</li>
        <li><strong className="text-foreground">Score locking</strong> — Once scores are finalized for a workout, the owner can lock it. Locked scores cannot be edited by judges (owners and super users can still override).</li>
        <li><strong className="text-foreground">Leaderboard updates</strong> — The leaderboard automatically recalculates when scores are saved, giving real-time rankings.</li>
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
        <li><strong className="text-foreground">Public access</strong> — The leaderboard is visible to all viewers on the competition page, even without an account.</li>
      </ul>
    ),
  },
  {
    id: "athlete-profiles",
    icon: Users,
    title: "Athlete Profiles & Claiming",
    content: (
      <div className="space-y-3 text-muted-foreground">
        <p>Athletes can <strong className="text-foreground">claim and manage</strong> their competition profiles to track history across events.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">Profile claiming</strong> — If an organizer registered you, claim your athlete record by matching your email or searching by name from the Performances page.</li>
          <li><strong className="text-foreground">Edit your profile</strong> — Once linked, update your name, email, phone, gender, and date of birth from the Performances page.</li>
          <li><strong className="text-foreground">Merging duplicates</strong> — Organizers can merge duplicate athlete records. The merge handles conflicts when both records have registrations for the same competition (choose to skip or reassign).</li>
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
        <p>The <strong className="text-foreground">Performances</strong> page is your personal dashboard for tracking results across all competitions.</p>
        <ul className="space-y-2 list-disc list-inside">
          <li><strong className="text-foreground">Competition history</strong> — See every competition you've participated in, with your division, final rank, and total score.</li>
          <li><strong className="text-foreground">Detail drilldown</strong> — Click any competition to see a per-workout breakdown including your score, rank, and points earned for each event.</li>
          <li><strong className="text-foreground">Leaderboard preview</strong> — The detail view includes a mini leaderboard so you can see how you compared to other competitors.</li>
        </ul>
      </div>
    ),
  },
];
export default function Guide() {
  const navigate = useNavigate();

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
