import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";

interface CompetitionHeaderProps {
  title: string;
  subscriptionTier?: string;
  avatarUrl?: string | null;
  displayName?: string | null;
}

export function CompetitionHeader({
  title,
  subscriptionTier = "free",
  avatarUrl,
  displayName,
}: CompetitionHeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const tierLabel =
    subscriptionTier === "tournament_pro"
      ? "TOURNAMENT PRO"
      : subscriptionTier === "affiliate_pro"
      ? "AFFILIATE PRO"
      : null;

  const tierColor =
    subscriptionTier === "tournament_pro"
      ? "bg-primary text-primary-foreground"
      : subscriptionTier === "affiliate_pro"
      ? "bg-accent text-accent-foreground"
      : "";

  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "MA";

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <img
          src={logoCompact}
          alt="Martial Athletic"
          className="w-9 h-9 object-contain"
        />
        <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight uppercase">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {tierLabel && (
          <span
            className={`hidden sm:inline-flex text-xs font-bold px-2.5 py-1 rounded ${tierColor}`}
          >
            {tierLabel}
          </span>
        )}

        <Avatar className="h-8 w-8">
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
