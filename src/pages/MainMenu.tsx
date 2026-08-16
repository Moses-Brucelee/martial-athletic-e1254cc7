import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { V1_FULL_ACCESS, MENU_FEATURE_TO_FLAG, type FeatureFlagKey } from "@/lib/featureFlags";
import { useFeatureFlags } from "@/hooks/useFeatureFlag";
import { useTier } from "@/hooks/useTier";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LogOut, Trophy, Eye, User, AlertCircle,
  Users, Link2, Settings, BarChart3, Palette, ChevronRight,
} from "lucide-react";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";
import type { LucideIcon } from "lucide-react";

import { UpcomingCompetitionsSpotlight } from "@/components/dashboard/UpcomingCompetitionsSpotlight";
import { BrowseMarketplaceSection } from "@/components/dashboard/BrowseMarketplaceSection";
import { ProgramSpotlight } from "@/components/dashboard/ProgramSpotlight";
import { FeaturedCompetitionHero } from "@/components/dashboard/FeaturedCompetitionHero";
import { DashboardRail } from "@/components/dashboard/DashboardRail";
import { ProfileCompletionBanner } from "@/components/ProfileCompletionBanner";

const ICON_MAP: Record<string, LucideIcon> = {
  User, Eye, Trophy, Users, Link2, Settings, BarChart3, Palette,
};

interface DbMenuItem {
  id: string;
  tier_key: string;
  feature_key: string;
  label: string;
  icon_name: string;
  route: string;
  description: string | null;
  sort_order: number;
}

function MenuItem({ label, description, icon: Icon, onClick }: { label: string; description?: string | null; icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 text-left group"
    >
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-foreground tracking-wide uppercase truncate">
          {label}
        </span>
        {description && (
          <span className="block text-[11px] text-muted-foreground mt-0.5 truncate">{description}</span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

export default function MainMenu() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const { canAccess, loading: subLoading } = useSubscription();
  const { flags, loading: flagsLoading } = useFeatureFlags();
  const { tier, isAtLeast, loading: tierLoading } = useTier();
  const [hasCompetitions, setHasCompetitions] = useState(false);
  const [compLoading, setCompLoading] = useState(true);

  const [menuItems, setMenuItems] = useState<DbMenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { count } = await supabase
        .from("competitions")
        .select("id", { count: "exact", head: true })
        .eq("created_by", user.id);
      setHasCompetitions((count ?? 0) > 0);
      setCompLoading(false);
    };
    check();
  }, [user]);

  useEffect(() => {
    const fetchMenu = async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setMenuItems((data as DbMenuItem[]) ?? []);
      setMenuLoading(false);
    };
    fetchMenu();
  }, []);

  // Profile completeness is now a soft concern (handled via banner in Slice E),
  // not a hard route redirect. Intentionally no navigation effect here.

  // Map feature_key -> minimum required tier slug. Items not listed have no tier gate.
  // Keys must match menu_items.feature_key in DB.
  const FEATURE_TIER_REQUIREMENT: Record<string, string> = {
    create_competitions: "affiliate_pro",
    manage_members: "affiliate_pro",
    manage_affiliation: "affiliate_pro",
    link_gym_website: "affiliate_pro",
    // track_performances + view_profile + view_leaderboards: free
  };

  // Flatten all accessible menu items (no tier grouping)
  // manage_members + link_gym_website are now sub-tabs inside manage_affiliation
  const HIDDEN_FEATURES = new Set(["manage_members", "link_gym_website", "track_performances"]);
  const accessibleItems = useMemo(() => {
    const passesGates = (m: DbMenuItem) => {
      if (!V1_FULL_ACCESS && !canAccess(m.feature_key)) return false;
      const flagKey = MENU_FEATURE_TO_FLAG[m.feature_key] as FeatureFlagKey | undefined;
      if (flagKey && flags[flagKey] === false) return false;
      const requiredTier = FEATURE_TIER_REQUIREMENT[m.feature_key];
      if (requiredTier && !isAtLeast(requiredTier)) return false;
      return true;
    };

    const visible = menuItems.filter((m) => !HIDDEN_FEATURES.has(m.feature_key) && passesGates(m));

    // "View leaderboards" and "Create / manage competitions" both land on /competitions.
    // Collapse them into a single Competitions entry.
    const canCreate = visible.some((m) => m.feature_key === "create_competitions");

    return visible
      .filter((m) => !(canCreate && m.feature_key === "view_leaderboards"))
      .map((m) => {
        if (m.feature_key === "create_competitions") {
          return {
            ...m,
            label: "Competitions",
            description: "Browse events, build and run your own",
            icon_name: "Trophy",
          };
        }
        if (m.feature_key === "view_leaderboards") {
          return {
            ...m,
            label: "Competitions",
            description: "Browse events and live leaderboards",
            icon_name: "Trophy",
          };
        }
        return m;
      });
  }, [menuItems, canAccess, flags, isAtLeast]);


  const initials = profile?.display_name
    ? profile.display_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "MA";

  const firstName = profile?.display_name?.split(" ")[0] ?? "Athlete";

  const isLoading = profileLoading || compLoading || subLoading || menuLoading || flagsLoading || tierLoading;

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </header>
        <main className="max-w-lg mx-auto px-4 py-10 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </main>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-destructive">{profileError}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const handleItemClick = (item: DbMenuItem) => {
    if (item.feature_key === "create_competitions") {
      navigate(hasCompetitions ? "/competitions" : "/competition/create");
      return;
    }
    navigate(item.route);
  };

  const railItems = accessibleItems.map((item) => ({
    id: item.id,
    label: item.label,
    description: item.description,
    icon: ICON_MAP[item.icon_name] ?? User,
    onClick: () => handleItemClick(item),
  }));

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img src={logoCompact} alt="Martial Athletic" className="w-10 h-10 object-contain" />
          <span className="text-lg font-bold text-foreground tracking-tight uppercase hidden sm:inline">
            Martial Athletic
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9 text-muted-foreground hover:text-destructive" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-24 lg:pb-16 space-y-8 sm:space-y-12">
        <ProfileCompletionBanner />

        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border pb-4">
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground tracking-tight uppercase leading-none">
            Hey, {firstName}
          </h1>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground tabular-nums">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>

        {/* Featured + rail */}
        <div className="grid gap-6 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <FeaturedCompetitionHero />
          <DashboardRail
            name={profile?.display_name ?? firstName}
            initials={initials}
            avatarUrl={profile?.avatar_url}
            tierLabel={tier?.display_name}
            items={railItems}
          />
        </div>

        {/* Rows */}
        <div className="space-y-10 sm:space-y-14">
          <UpcomingCompetitionsSpotlight />
          <ProgramSpotlight />
          <BrowseMarketplaceSection />
        </div>
      </main>
    </div>
  );
}

