import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LogOut, Trophy, Eye, User, ArrowUp, AlertCircle, Lock,
  Users, Link2, Settings, BarChart3, Palette, ChevronRight,
} from "lucide-react";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";
import type { LucideIcon } from "lucide-react";

interface MenuItem {
  label: string;
  icon: LucideIcon;
  feature: string;
  route: string;
  description?: string;
}

const FREE_ITEMS: MenuItem[] = [
  { label: "VIEW PROFILE", icon: User, feature: "view_profile", route: "/profile" },
  { label: "VIEW COMPETITION LEADERBOARDS", icon: Eye, feature: "view_leaderboards", route: "/competitions" },
];

const AFFILIATE_ITEMS: MenuItem[] = [
  { label: "MANAGE MEMBERS", icon: Users, feature: "manage_members", route: "/members", description: "Get members linked to your account" },
  { label: "LINK GYM WEBSITE", icon: Link2, feature: "link_gym_website", route: "/gym-website", description: "Connect your gym's online presence" },
  { label: "CREATE / MANAGE COMPETITIONS", icon: Trophy, feature: "create_competitions", route: "/competitions", description: "Build and run competitions" },
  { label: "MANAGE AFFILIATION", icon: Settings, feature: "manage_affiliation", route: "/affiliation", description: "Control your affiliate settings" },
  { label: "TRACK MEMBER PERFORMANCES", icon: BarChart3, feature: "track_performances", route: "/performances", description: "Monitor athlete progress" },
];

const PRO_ITEMS: MenuItem[] = [
  { label: "ADVANCED ANALYTICS", icon: BarChart3, feature: "advanced_analytics", route: "/analytics", description: "Deep performance insights" },
  { label: "CUSTOM BRANDING", icon: Palette, feature: "custom_branding", route: "/branding", description: "White-label your competitions" },
];

function SectionHeader({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-3 pt-4 pb-1">
      <div className={`h-px flex-1 ${active ? "bg-primary/30" : "bg-border"}`} />
      <span
        className={`text-[11px] font-bold tracking-widest uppercase ${
          active ? "text-primary" : "text-muted-foreground/60"
        }`}
      >
        {label}
      </span>
      <div className={`h-px flex-1 ${active ? "bg-primary/30" : "bg-border"}`} />
    </div>
  );
}

function ActiveMenuItem({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors text-left group"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-bold text-foreground tracking-wide uppercase">{item.label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

function LockedMenuItem({ item, requiredTier, onUpgrade }: { item: MenuItem; requiredTier: string; onUpgrade: () => void }) {
  const Icon = item.icon;
  return (
    <div className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50 text-left opacity-70">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-bold text-muted-foreground tracking-wide uppercase">{item.label}</span>
        {item.description && (
          <p className="text-xs text-muted-foreground/60 mt-0.5">{item.description}</p>
        )}
      </div>
      <Badge
        variant="outline"
        className="cursor-pointer text-[10px] shrink-0 hover:bg-primary hover:text-primary-foreground transition-colors"
        onClick={onUpgrade}
      >
        UPGRADE
      </Badge>
    </div>
  );
}

export default function MainMenu() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const { tier, canAccess, loading: subLoading } = useSubscription();
  const [hasCompetitions, setHasCompetitions] = useState(false);
  const [compLoading, setCompLoading] = useState(true);

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
    if (!profileLoading && profile && !profile.profile_completed) {
      navigate("/create-profile", { replace: true });
    }
  }, [profile, profileLoading, navigate]);

  const tierLabel =
    tier === "tournament_pro"
      ? "TOURNAMENT PRO"
      : tier === "affiliate_pro"
      ? "AFFILIATE PRO"
      : "Free";

  const initials = profile?.display_name
    ? profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "MA";

  const isLoading = profileLoading || compLoading || subLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </header>
        <main className="max-w-md mx-auto px-4 py-12 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </main>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-destructive">{profileError}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const handleItemClick = (item: MenuItem) => {
    // Special handling for competitions route
    if (item.feature === "create_competitions") {
      navigate(hasCompetitions ? "/competitions" : "/competition/create");
      return;
    }
    navigate(item.route);
  };

  const goUpgrade = () => navigate("/upgrade");

  const renderSection = (label: string, items: MenuItem[], requiredTier: string) => {
    const sectionActive =
      requiredTier === "free" ||
      (requiredTier === "affiliate_pro" && (tier === "affiliate_pro" || tier === "tournament_pro")) ||
      (requiredTier === "tournament_pro" && tier === "tournament_pro");

    return (
      <div key={label}>
        <SectionHeader label={label} active={sectionActive} />
        <div className="space-y-2 mt-2">
          {items.map((item) => {
            // Override label for competitions dynamic CTA
            const displayItem =
              item.feature === "create_competitions" && hasCompetitions
                ? { ...item, label: "VIEW / BUILD YOUR COMP" }
                : item;

            return canAccess(item.feature) ? (
              <ActiveMenuItem key={item.feature} item={displayItem} onClick={() => handleItemClick(item)} />
            ) : (
              <LockedMenuItem key={item.feature} item={displayItem} requiredTier={requiredTier} onUpgrade={goUpgrade} />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <img src={logoCompact} alt="Martial Athletic" className="w-10 h-10 object-contain" />
          <span className="text-lg font-bold text-foreground tracking-tight uppercase">Main Menu</span>
        </div>
        <div className="flex items-center gap-2">
          {tier === "free" ? (
            <Badge
              variant="outline"
              className="cursor-pointer text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={goUpgrade}
            >
              <ArrowUp className="h-3 w-3 mr-1" />
              UPGRADE
            </Badge>
          ) : (
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-primary text-primary-foreground">
              {tierLabel}
            </span>
          )}
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-md space-y-1">
          {renderSection("FREE", FREE_ITEMS, "free")}
          {renderSection("AFFILIATE PRO", AFFILIATE_ITEMS, "affiliate_pro")}
          {renderSection("TOURNAMENT PRO", PRO_ITEMS, "tournament_pro")}
        </div>
      </main>
    </div>
  );
}
