import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, ArrowLeft } from "lucide-react";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";

export default function Performances() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 sm:px-8 py-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <img src={logoCompact} alt="Martial Athletic" className="w-8 h-8 object-contain" />
        <span className="text-sm font-bold text-foreground tracking-tight uppercase">Performances</span>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <BarChart3 className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Track Performances</h1>
          <p className="text-sm text-muted-foreground">
            Athlete stats dashboard — view competition history, rankings, progress, and personal records. Coming soon.
          </p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Main Menu
          </Button>
        </div>
      </main>
    </div>
  );
}
