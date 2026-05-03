import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus, X } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { isProfileComplete } from "@/lib/profileCompletion";

const SESSION_DISMISS_KEY = "ma-profile-banner-dismissed";

/**
 * Soft, dismissable nudge to finish profile setup. Renders only when the
 * profile is loaded and incomplete, and disappears for the rest of the
 * session once the user closes it. Never blocks navigation.
 */
export function ProfileCompletionBanner() {
  const navigate = useNavigate();
  const { profile, loading } = useProfile();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(SESSION_DISMISS_KEY) === "1");
  }, []);

  if (loading || !profile) return null;
  if (isProfileComplete(profile)) return null;
  if (dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <UserPlus className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Finish your profile</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add a few more details to your profile so others can find you.
        </p>
        <div className="mt-3">
          <Button
            size="sm"
            onClick={() => navigate("/create-profile")}
            className="h-8 text-xs font-semibold"
          >
            Complete profile
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
