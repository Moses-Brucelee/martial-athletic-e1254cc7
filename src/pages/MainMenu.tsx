import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Trophy, Eye, User, ArrowUp, AlertCircle } from "lucide-react";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";

export default function MainMenu() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useProfile();
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

  // Redirect to create-profile if not completed
  useEffect(() => {
    if (!profileLoading && profile && !profile.profile_completed) {
      navigate("/create-profile", { replace: true });
    }
  }, [profile, profileLoading, navigate]);

  const tierLabel =
    profile?.subscription_tier === "tournament_pro"
      ? "TOURNAMENT PRO"
      : profile?.subscription_tier === "affiliate_pro"
      ? "AFFILIATE PRO"
      : "Free";

  const tierColor =
    profile?.subscription_tier === "tournament_pro"
      ? "bg-primary text-primary-foreground"
      : profile?.subscription_tier === "affiliate_pro"
      ? "bg-accent text-accent-foreground"
      : "text-accent";

  const initials = profile?.display_name
    ? profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "MA";

  if (profileLoading || compLoading) {
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

  const menuItems = [
    {
      label: hasCompetitions ? "VIEW / BUILD YOUR COMP" : "CREATE COMPETITION",
      icon: Trophy,
      onClick: () =>
        hasCompetitions
          ? navigate("/dashboard") // TODO: navigate to competition list
          : navigate("/competition/create"),
    },
    {
      label: "VIEW COMPETITIONS",
      icon: Eye,
      onClick: () => navigate("/dashboard"), // TODO: competition list
    },
    {
      label: "VIEW PROFILE",
      icon: User,
      onClick: () => navigate("/create-profile"),
    },
    {
      label: "UPGRADE PACKAGE",
      icon: ArrowUp,
      onClick: () => {}, // TODO: upgrade flow
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <img src={logoCompact} alt="Martial Athletic" className="w-10 h-10 object-contain" />
          <span className="text-lg font-bold text-foreground tracking-tight uppercase">Main Menu</span>
        </div>
        <div className="flex items-center gap-2">
          {profile?.subscription_tier !== "free" && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded ${tierColor}`}>
              {tierLabel}
            </span>
          )}
          {profile?.subscription_tier === "free" && (
            <span className="text-xs font-semibold text-accent">{tierLabel}</span>
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

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-3">
          {menuItems.map(({ label, icon: Icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-bold text-foreground tracking-wide uppercase">
                {label}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
