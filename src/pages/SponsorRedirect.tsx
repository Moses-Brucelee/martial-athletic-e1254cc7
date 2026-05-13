import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink, ArrowLeft, ShieldAlert } from "lucide-react";
import { trackSponsorClick } from "@/lib/posterAssets";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";

export default function SponsorRedirect() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const url = params.get("url") || "";
  const competitionId = params.get("c") || "";
  const path = params.get("p") || "";

  const safeUrl = useMemo(() => {
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      return u.toString();
    } catch {
      return null;
    }
  }, [url]);

  const host = safeUrl ? new URL(safeUrl).hostname : "";

  const [seconds, setSeconds] = useState(5);
  const [tracked, setTracked] = useState(false);

  // Track click once
  useEffect(() => {
    if (!safeUrl || !competitionId || !path || tracked) return;
    setTracked(true);
    trackSponsorClick(competitionId, path, safeUrl).catch(() => {});
  }, [safeUrl, competitionId, path, tracked]);

  // Auto-redirect countdown
  useEffect(() => {
    if (!safeUrl) return;
    if (seconds <= 0) {
      window.location.replace(safeUrl);
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, safeUrl]);

  if (!safeUrl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <ShieldAlert className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Invalid sponsor link</h1>
          <p className="text-sm text-muted-foreground">
            The link is missing or not a valid web address.
          </p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-5 text-center">
        <img src={logoCompact} alt="Martial Athletic" className="h-12 w-12 mx-auto" />
        <ShieldAlert className="h-8 w-8 text-accent mx-auto" />
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight">
            You're leaving Martial Athletic
          </h1>
          <p className="text-sm text-muted-foreground">
            You're about to visit an external sponsor website. We can't vouch for the
            content or security of pages outside Martial Athletic.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3 break-all text-sm font-mono">
          {host}
        </div>

        <p className="text-xs text-muted-foreground">
          Redirecting in <span className="font-bold text-foreground">{seconds}</span>s…
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Cancel
          </Button>
          <Button
            asChild
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <a href={safeUrl} rel="noopener noreferrer nofollow">
              <ExternalLink className="h-4 w-4 mr-1.5" /> Continue
            </a>
          </Button>
        </div>

        <Link to="/" className="block text-xs text-muted-foreground hover:text-foreground">
          Back to Martial Athletic
        </Link>
      </div>
    </div>
  );
}
