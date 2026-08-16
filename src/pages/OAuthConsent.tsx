import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertCircle } from "lucide-react";
import logoCompact from "@/assets/martial-athletic-logo-compact.png";

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

function oauth(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id in the request URL.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?redirectTo=" + encodeURIComponent(next);
        return;
      }
      const { data, error: detailsError } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detailsError) {
        setError(detailsError.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error: decisionError } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "this application";

  return (
    <main className="min-h-dvh bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg">
        <div className="text-center mb-6">
          <img src={logoCompact} alt="Martial Athletic" className="w-16 h-16 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">AUTHORIZE ACCESS</h1>
        </div>

        {error ? (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">Couldn't load this request: {error}</p>
          </div>
        ) : !details ? (
          <p className="text-sm text-muted-foreground text-center">Loading request…</p>
        ) : (
          <>
            <div className="flex items-start gap-3 p-3 mb-6 rounded-lg bg-muted/50 border border-border">
              <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{clientName}</span> is requesting access to your Martial
                Athletic account. It can read your profile, competitions, registrations, leaderboards, and
                training programs on your behalf.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => decide(true)}
                disabled={busy}
                className="w-full h-12 text-base font-semibold tracking-wide"
              >
                Approve
              </Button>
              <Button onClick={() => decide(false)} disabled={busy} variant="outline" className="w-full h-12">
                Deny
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
