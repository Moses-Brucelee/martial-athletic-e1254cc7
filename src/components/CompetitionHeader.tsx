import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, LogOut, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";
import { V1_FULL_ACCESS } from "@/lib/featureFlags";

interface CompetitionHeaderProps {
  title: string;
  tierName?: string;
  avatarUrl?: string | null;
  displayName?: string | null;
  /** @deprecated Use tierName instead */
  subscriptionTier?: string;
  /** Show back arrow (default: true) */
  showBack?: boolean;
  /** Custom back route (default: /dashboard) */
  backTo?: string;
}

export function CompetitionHeader({
  title,
  tierName,
  avatarUrl,
  displayName,
  subscriptionTier,
  showBack = true,
  backTo = "/dashboard",
}: CompetitionHeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // Use tierName if provided, otherwise fall back to legacy prop
  const resolvedName = tierName ?? subscriptionTier?.toUpperCase();
  const showBadge = !V1_FULL_ACCESS && resolvedName && resolvedName !== "FREE" && resolvedName !== "free";

  const initials = displayName
    ? displayName
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
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <img
          src={logoCompact}
          alt="Martial Athletic"
          className="w-9 h-9 object-contain cursor-pointer shrink-0"
          onClick={() => navigate("/dashboard")}
        />
        <h1 className="text-sm sm:text-base font-bold text-foreground tracking-tight uppercase truncate">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {showBadge && (
          <span className="hidden sm:inline-flex text-xs font-bold px-2.5 py-1 rounded bg-primary text-primary-foreground">
            {resolvedName}
          </span>
        )}

        <Avatar
          className="h-8 w-8 cursor-pointer"
          onClick={() => navigate("/profile")}
        >
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate("/dashboard")}>
              Main Menu
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/competition/create")}>
              Create Competition
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
