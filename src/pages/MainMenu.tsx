import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { V1_FULL_ACCESS } from "@/lib/featureFlags";
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

// Icon lookup — map icon_name string from DB to Lucide component
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

interface DbTier {
  key: string;
  name: string;
  sort_order: number;
}

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

function ActiveMenuItem({ label, icon: Icon, onClick }: { label: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors text-left group"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-bold text-foreground tracking-wide uppercase">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

function LockedMenuItem({ label, description, onUpgrade }: { label: string; description?: string | null; onUpgrade: () => void }) {
  return (
    <div className="w-full flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50 text-left opacity-70">
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-bold text-muted-foreground tracking-wide uppercase">{label}</span>
        {description && (
          <p className="text-xs text-muted-foreground/60 mt-0.5">{description}</p>
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
  const { tierKey, tierName, canAccess, loading: subLoading } = useSubscription();
  const [hasCompetitions, setHasCompetitions] = useState(false);
  const [compLoading, setCompLoading] = useState(true);

  // DB-driven data
  const [menuItems, setMenuItems] = useState<DbMenuItem[]>([]);
  const [activeTiers, setActiveTiers] = useState<DbTier[]>([]);
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

  // Fetch menu items and active tiers from DB
  useEffect(() => {
    const fetchMenu = async () => {
      const [itemsRes, tiersRes] = await Promise.all([
        supabase
          .from("menu_items")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("pricing_tiers")
          .select("key, name, sort_order")
          .eq("is_active", true)
          .order("sort_order"),
      ]);
      setMenuItems((itemsRes.data as DbMenuItem[]) ?? []);
      setActiveTiers((tiersRes.data as DbTier[]) ?? []);
      setMenuLoading(false);
    };
    fetchMenu();
  }, []);

  useEffect(() => {
    if (!profileLoading && profile && !profile.profile_completed) {
      navigate("/create-profile", { replace: true });
    }
  }, [profile, profileLoading, navigate]);

  // Group menu items by tier_key, only for active tiers
  const sections = useMemo(() => {
    const activeTierKeys = new Set(activeTiers.map((t) => t.key));
    const grouped: { tier: DbTier; items: DbMenuItem[] }[] = [];
    for (const tier of activeTiers) {
      const items = menuItems.filter(
        (m) => m.tier_key === tier.key && activeTierKeys.has(m.tier_key)
      );
      if (items.length > 0) grouped.push({ tier, items });
    }
    return grouped;
  }, [menuItems, activeTiers]);

  const initials = profile?.display_name
    ? profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "MA";

  const isLoading = profileLoading || compLoading || subLoading || menuLoading;

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

  const handleItemClick = (item: DbMenuItem) => {
    if (item.feature_key === "create_competitions") {
      navigate(hasCompetitions ? "/competitions" : "/competition/create");
      return;
    }
    navigate(item.route);
  };

  const goUpgrade = () => navigate("/upgrade");

  const isFree = tierKey === "free";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <img src={logoCompact} alt="Martial Athletic" className="w-10 h-10 object-contain" />
          <span className="text-lg font-bold text-foreground tracking-tight uppercase">Main Menu</span>
        </div>
        <div className="flex items-center gap-2">
          {!V1_FULL_ACCESS && isFree ? (
            <Badge
              variant="outline"
              className="cursor-pointer text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={goUpgrade}
            >
              <ArrowUp className="h-3 w-3 mr-1" />
              UPGRADE
            </Badge>
          ) : !V1_FULL_ACCESS ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-primary text-primary-foreground">
              {tierName}
            </span>
          ) : null}
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
          {sections.map(({ tier, items }) => {
            const sectionActive = V1_FULL_ACCESS || canAccess(items[0]?.feature_key ?? "");

            return (
              <div key={tier.key}>
                <SectionHeader label={tier.name} active={sectionActive} />
                <div className="space-y-2 mt-2">
                  {items.map((item) => {
                    const Icon = ICON_MAP[item.icon_name] ?? User;
                    const displayLabel =
                      item.feature_key === "create_competitions" && hasCompetitions
                        ? "VIEW / BUILD YOUR COMP"
                        : item.label;

                    return (V1_FULL_ACCESS || canAccess(item.feature_key)) ? (
                      <ActiveMenuItem
                        key={item.id}
                        label={displayLabel}
                        icon={Icon}
                        onClick={() => handleItemClick(item)}
                      />
                    ) : (
                      <LockedMenuItem
                        key={item.id}
                        label={displayLabel}
                        description={item.description}
                        onUpgrade={goUpgrade}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
