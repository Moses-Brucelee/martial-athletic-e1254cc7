import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"loading" | "valid" | "already" | "invalid" | "done" | "error">("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const json = await res.json().catch(() => ({}));
        if (json?.alreadyUnsubscribed) {
          setState("already");
        } else if (json?.valid) {
          setEmail(json.email ?? null);
          setState("valid");
        } else {
          setState("invalid");
        }
      } catch {
        setState("invalid");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setSubmitting(false);
    setState(error ? "error" : "done");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full border border-border rounded-lg p-8 text-center space-y-4 bg-card">
        <h1 className="text-2xl font-bold text-foreground">Email preferences</h1>
        {state === "loading" && <p className="text-muted-foreground">Checking your link…</p>}
        {state === "invalid" && <p className="text-muted-foreground">This unsubscribe link is invalid or expired.</p>}
        {state === "already" && <p className="text-muted-foreground">You're already unsubscribed.</p>}
        {state === "valid" && (
          <>
            <p className="text-muted-foreground">
              Unsubscribe {email ? <strong>{email}</strong> : "this address"} from app emails?
            </p>
            <Button onClick={confirm} disabled={submitting}>
              {submitting ? "Working…" : "Confirm unsubscribe"}
            </Button>
          </>
        )}
        {state === "done" && <p className="text-muted-foreground">You've been unsubscribed.</p>}
        {state === "error" && <p className="text-destructive">Something went wrong. Please try again.</p>}
      </div>
    </div>
  );
}
