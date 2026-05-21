import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <img src={logoCompact} alt="Martial Athletic" className="w-8 h-8 object-contain cursor-pointer" onClick={() => navigate("/")} />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-sm">
          <h1 className="text-7xl font-bold text-primary">404</h1>
          <p className="text-lg text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate(-1)} variant="outline" className="min-h-[44px]">
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
            <Button onClick={() => navigate("/dashboard")} className="min-h-[44px]">
              <Home className="h-4 w-4 mr-2" /> Dashboard
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
