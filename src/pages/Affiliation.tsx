import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

export default function Affiliation() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Affiliation" />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <Users className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Manage Affiliation</h1>
          <p className="text-sm text-muted-foreground">
            Gym membership hub — browse gyms, manage affiliations, view network membership status. Coming soon.
          </p>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Main Menu
          </Button>
        </div>
      </main>
    </div>
  );
}
