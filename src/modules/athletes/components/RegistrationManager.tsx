import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface RegistrationManagerProps {
  competitionId: string;
  canAdmin: boolean;
}

async function fetchRegistrations(competitionId: string) {
  const { data, error } = await supabase
    .from("athlete_registrations")
    .select("*")
    .eq("competition_id", competitionId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export function RegistrationManager({ competitionId, canAdmin }: RegistrationManagerProps) {
  const qc = useQueryClient();

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["registrations", competitionId],
    queryFn: () => fetchRegistrations(competitionId),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("athlete_registrations")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registrations", competitionId] });
      toast.success("Registration updated");
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const pending = registrations.filter((r) => r.status === "pending");
  const confirmed = registrations.filter((r) => r.status === "confirmed");
  const rejected = registrations.filter((r) => r.status === "rejected");

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No registrations yet.</p>
      </div>
    );
  }

  const statusColor = (status: string) => {
    if (status === "confirmed") return "text-green-600 bg-green-500/10";
    if (status === "rejected") return "text-destructive bg-destructive/10";
    return "text-yellow-600 bg-yellow-500/10";
  };

  const renderRow = (r: typeof registrations[0]) => (
    <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-background border border-border">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">{r.athlete_name}</span>
        <Badge variant="outline" className={`text-xs shrink-0 ${statusColor(r.status)}`}>
          {r.status}
        </Badge>
      </div>
      {canAdmin && r.status === "pending" && (
        <div className="flex gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-green-600 hover:text-green-700 hover:bg-green-500/10"
            onClick={() => updateStatus.mutate({ id: r.id, status: "confirmed" })}
            disabled={updateStatus.isPending}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => updateStatus.mutate({ id: r.id, status: "rejected" })}
            disabled={updateStatus.isPending}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
          </Button>
        </div>
      )}
      {canAdmin && r.status !== "pending" && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-muted-foreground text-xs"
          onClick={() => updateStatus.mutate({ id: r.id, status: "pending" })}
          disabled={updateStatus.isPending}
        >
          Reset
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <Clock className="h-4 w-4 text-yellow-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{pending.length}</p>
          <p className="text-xs text-muted-foreground uppercase">Pending</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{confirmed.length}</p>
          <p className="text-xs text-muted-foreground uppercase">Confirmed</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <XCircle className="h-4 w-4 text-destructive mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{rejected.length}</p>
          <p className="text-xs text-muted-foreground uppercase">Rejected</p>
        </div>
      </div>

      {/* Pending first */}
      {pending.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-foreground uppercase mb-3 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-yellow-600" /> Pending Review ({pending.length})
          </h3>
          <div className="space-y-1.5">{pending.map(renderRow)}</div>
        </div>
      )}

      {/* Confirmed */}
      {confirmed.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-foreground uppercase mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> Confirmed ({confirmed.length})
          </h3>
          <div className="space-y-1.5">{confirmed.map(renderRow)}</div>
        </div>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-bold text-foreground uppercase mb-3 flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-destructive" /> Rejected ({rejected.length})
          </h3>
          <div className="space-y-1.5">{rejected.map(renderRow)}</div>
        </div>
      )}
    </div>
  );
}
