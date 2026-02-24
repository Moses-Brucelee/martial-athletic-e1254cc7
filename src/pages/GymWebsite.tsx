import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Link2, ArrowLeft } from "lucide-react";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";

export default function GymWebsite() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 sm:px-8 py-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <img src={logoCompact} alt="Martial Athletic" className="w-8 h-8 object-contain" />
        <span className="text-sm font-bold text-foreground tracking-tight uppercase">Gym Website</span>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <Link2 className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Link Gym Website</h1>
          <p className="text-sm text-muted-foreground">
            Gym profile editor — build and manage your gym's public landing page, schedule, branding, and contact info. Coming soon.
          </p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Main Menu
          </Button>
        </div>
      </main>
    </div>
  );
}
