import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/AppHeader";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Mail } from "lucide-react";

type State =
  | { kind: "loading" }
  | { kind: "needs-auth" }
  | { kind: "ready"; gymName: string; inviterEmail?: string }
  | { kind: "wrong-email"; expected: string }
  | { kind: "already"; status: "accepted" | "declined" }
  | { kind: "done"; status: "accepted" | "declined"; gymId?: string }
  | { kind: "error"; message: string };

export default function InviteResponse() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading || !id) return;
    if (!user) {
      setState({ kind: "needs-auth" });
      return;
    }
    (async () => {
      const { data: invite, error } = await (supabase as any)
        .from("gym_member_invitations")
        .select("id, email, gym_id, accepted_at, declined_at, gyms(name)")
        .eq("id", id)
        .maybeSingle();

      if (error || !invite) {
        setState({ kind: "error", message: "Invitation not found or no longer valid." });
        return;
      }
      if ((user.email ?? "").toLowerCase() !== invite.email.toLowerCase()) {
        setState({ kind: "wrong-email", expected: invite.email });
        return;
      }
      if (invite.accepted_at) return setState({ kind: "already", status: "accepted" });
      if (invite.declined_at) return setState({ kind: "already", status: "declined" });
      setState({ kind: "ready", gymName: invite.gyms?.name ?? "the gym" });
    })();
  }, [id, user, authLoading]);

  const respond = async (accept: boolean) => {
    if (!id) return;
    setSubmitting(true);
    const { data, error } = await (supabase as any).rpc("respond_to_gym_invitation", {
      p_invitation_id: id,
      p_accept: accept,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const status = (data?.status as string) ?? (accept ? "accepted" : "declined");
    if (status === "accepted" || status === "already_accepted") {
      setState({ kind: "done", status: "accepted", gymId: data?.gym_id });
    } else {
      setState({ kind: "done", status: "declined" });
    }
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <AppHeader title="Gym invitation" />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-4 text-center">
            {state.kind === "loading" && <Skeleton className="h-32 w-full" />}

            {state.kind === "needs-auth" && (
              <>
                <Mail className="h-10 w-10 text-primary mx-auto" />
                <h2 className="text-xl font-bold">Sign in to respond</h2>
                <p className="text-sm text-muted-foreground">
                  Sign in or create an account with the email this invitation was sent to.
                </p>
                <div className="flex gap-2 justify-center pt-2">
                  <Button onClick={() => navigate(`/login?redirect=/invite/${id}`)}>Sign in</Button>
                  <Button variant="outline" onClick={() => navigate(`/register?redirect=/invite/${id}`)}>
                    Create account
                  </Button>
                </div>
              </>
            )}

            {state.kind === "wrong-email" && (
              <>
                <XCircle className="h-10 w-10 text-destructive mx-auto" />
                <h2 className="text-xl font-bold">Wrong account</h2>
                <p className="text-sm text-muted-foreground">
                  This invitation was sent to <strong>{state.expected}</strong>. Please sign in with that email.
                </p>
                <Button variant="outline" onClick={() => supabase.auth.signOut().then(() => navigate(`/login?redirect=/invite/${id}`))}>
                  Switch account
                </Button>
              </>
            )}

            {state.kind === "ready" && (
              <>
                <Mail className="h-10 w-10 text-primary mx-auto" />
                <h2 className="text-xl font-bold">Join {state.gymName}?</h2>
                <p className="text-sm text-muted-foreground">
                  Accept to join, or decline if this wasn't expected.
                </p>
                <div className="flex gap-2 justify-center pt-2">
                  <Button onClick={() => respond(true)} disabled={submitting}>
                    {submitting ? "Working..." : "Accept"}
                  </Button>
                  <Button variant="outline" onClick={() => respond(false)} disabled={submitting}>
                    Decline
                  </Button>
                </div>
              </>
            )}

            {state.kind === "already" && (
              <>
                <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-bold">Already {state.status}</h2>
                <p className="text-sm text-muted-foreground">You already responded to this invitation.</p>
                <Button onClick={() => navigate("/dashboard")}>Go to dashboard</Button>
              </>
            )}

            {state.kind === "done" && (
              <>
                {state.status === "accepted" ? (
                  <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
                ) : (
                  <XCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                )}
                <h2 className="text-xl font-bold">
                  Invitation {state.status === "accepted" ? "accepted" : "declined"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {state.status === "accepted"
                    ? "You're now a member."
                    : "Got it — no changes made."}
                </p>
                <Button onClick={() => navigate("/dashboard")}>Continue</Button>
              </>
            )}

            {state.kind === "error" && (
              <>
                <XCircle className="h-10 w-10 text-destructive mx-auto" />
                <h2 className="text-xl font-bold">Something went wrong</h2>
                <p className="text-sm text-muted-foreground">{state.message}</p>
                <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to dashboard</Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
