import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, LogOut } from "lucide-react";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";

interface AppHeaderProps {
  /** Page title shown in the header */
  title: string;
  /** Show back arrow to navigate to dashboard (default: true) */
  showBack?: boolean;
  /** Custom back route (default: /dashboard) */
  backTo?: string;
  /** Hide avatar (useful for profile-creation pages) */
  hideAvatar?: boolean;
}

export function AppHeader({
  title,
  showBack = true,
  backTo = "/dashboard",
  hideAvatar = false,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile } = useProfile();

  const initials = profile?.display_name
    ? profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "MA";

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-2 min-w-0">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate(backTo)}
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <img
          src={logoCompact}
          alt="Martial Athletic"
          className="w-8 h-8 object-contain shrink-0 cursor-pointer"
          onClick={() => navigate("/dashboard")}
        />
        <span className="text-sm font-bold text-foreground tracking-tight uppercase truncate">
          {title}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!hideAvatar && (
          <Avatar
            className="h-8 w-8 border-2 border-primary/20 cursor-pointer"
            onClick={() => navigate("/profile")}
          >
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
