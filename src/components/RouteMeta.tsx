import { matchPath, useLocation } from "react-router-dom";
import { SEO } from "@/components/SEO";

/**
 * Fallback per-route head metadata.
 *
 * Routes that render their own <SEO /> are listed in OWN_SEO_ROUTES and skipped
 * here, so a page never ships two canonical links.
 */
const OWN_SEO_ROUTES = [
  "/",
  "/login",
  "/register",
  "/guide",
  "/tutorial",
  "/browse",
  "/programs",
  "/event/:id",
  "/privacy",
  "/terms",
];

interface RouteMetaEntry {
  pattern: string;
  title: string;
  description: string;
  /** Gated or transactional routes: unique metadata, but kept out of the index. */
  noindex?: boolean;
}

const ROUTE_META: RouteMetaEntry[] = [
  {
    pattern: "/forgot-password",
    title: "Reset Your Password | Martial Athletic",
    description:
      "Get a password reset link for your Martial Athletic account.",
  },
  {
    pattern: "/reset-password",
    title: "Set a New Password | Martial Athletic",
    description: "Choose a new password for your Martial Athletic account.",
    noindex: true,
  },
  {
    pattern: "/create-profile",
    title: "Create Your Athlete Profile | Martial Athletic",
    description:
      "Add your display name, affiliation, date of birth and gender so you can register for competitions.",
    noindex: true,
  },
  {
    pattern: "/dashboard",
    title: "Main Menu | Martial Athletic",
    description: "Your Martial Athletic home: competitions, programs, profile and platform tools.",
    noindex: true,
  },
  {
    pattern: "/profile",
    title: "My Profile | Martial Athletic",
    description: "View and update your athlete profile, affiliation and competition history.",
    noindex: true,
  },
  {
    pattern: "/competitions",
    title: "My Competitions | Martial Athletic",
    description: "Competitions you host or take part in, with status, dates and quick access.",
    noindex: true,
  },
  {
    pattern: "/competition/create",
    title: "Create a Competition | Martial Athletic",
    description:
      "Set up a new fitness competition: details, divisions, workouts, registration and scoring.",
    noindex: true,
  },
  {
    pattern: "/competition/:id",
    title: "Competition Dashboard | Martial Athletic",
    description:
      "Manage registrations, divisions, workouts, judges, heats, scores and leaderboards for your competition.",
    noindex: true,
  },
  {
    pattern: "/super-dashboard",
    title: "Platform Administration | Martial Athletic",
    description: "Administration tools for users, competitions, feature flags and affiliations.",
    noindex: true,
  },
  {
    pattern: "/members",
    title: "Gym Members | Martial Athletic",
    description: "Manage your gym roster, invitations, affiliation requests and member discounts.",
    noindex: true,
  },
  {
    pattern: "/affiliation",
    title: "Affiliation Network | Martial Athletic",
    description: "Manage your affiliate network and cross-affiliation leaderboards.",
    noindex: true,
  },
  {
    pattern: "/gym-website",
    title: "Gym Website Builder | Martial Athletic",
    description:
      "Build your gym's public page: branding, schedule, contact details, and a link to your competitions.",
    noindex: true,
  },
  {
    pattern: "/performances",
    title: "My Performances | Martial Athletic",
    description: "Track personal bests and results across every competition and training session.",
    noindex: true,
  },
  {
    pattern: "/event/:id/results",
    title: "Competition Results | Martial Athletic",
    description: "Final standings, workout rankings and scores for this competition.",
    noindex: true,
  },
  {
    pattern: "/programs/session/:id",
    title: "Workout Session | Martial Athletic",
    description: "Run your workout with built-in timers and log results as you go.",
    noindex: true,
  },
  {
    pattern: "/programs/:id",
    title: "Training Program | Martial Athletic",
    description: "Weekly structure, workouts and enrolment details for this training program.",
    noindex: true,
  },
  {
    pattern: "/invite/:id",
    title: "Respond to Invitation | Martial Athletic",
    description: "Accept or decline your gym or team invitation.",
    noindex: true,
  },
  {
    pattern: "/unsubscribe",
    title: "Email Preferences | Martial Athletic",
    description: "Unsubscribe from Martial Athletic notification emails.",
    noindex: true,
  },
  {
    pattern: "/sponsor-redirect",
    title: "Sponsor Link | Martial Athletic",
    description: "You're being redirected to a competition sponsor's website.",
    noindex: true,
  },
];

export function RouteMeta() {
  const { pathname } = useLocation();

  if (OWN_SEO_ROUTES.some((p) => matchPath({ path: p, end: true }, pathname))) return null;

  const entry = ROUTE_META.find((m) => matchPath({ path: m.pattern, end: true }, pathname));

  if (!entry) {
    return (
      <SEO
        title="Page Not Found | Martial Athletic"
        description="This page could not be found. Browse competitions and training programs on Martial Athletic."
        path={pathname}
        noindex
      />
    );
  }

  return (
    <SEO
      title={entry.title}
      description={entry.description}
      path={pathname}
      noindex={entry.noindex}
    />
  );
}
