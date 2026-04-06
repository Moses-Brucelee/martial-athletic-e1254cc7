import { Badge } from "@/components/ui/badge";
import { Check, Calendar, MapPin, Users, Dumbbell, Trophy, ShieldCheck } from "lucide-react";
import type { QuickWorkout } from "./StepQuickWorkouts";
import type { RegistrationConfig } from "./StepRegistration";
import { format } from "date-fns";

interface StepReviewProps {
  name: string;
  venue: string;
  hostGym: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  regDeadline: Date | undefined;
  competitionType: string;
  divisions: string[];
  workouts: QuickWorkout[];
  rankingDirection: "desc" | "asc";
  registration: RegistrationConfig;
}

function fmt(d: Date | undefined) {
  return d ? format(d, "PPP p") : "—";
}

export function StepReview({
  name,
  venue,
  hostGym,
  startDate,
  endDate,
  regDeadline,
  competitionType,
  divisions,
  workouts,
  rankingDirection,
  registration,
}: StepReviewProps) {
  return (
    <div className="space-y-4">
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-2">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Review everything below.</strong> Hit "Create Competition" when ready — you can still edit details on the dashboard.
        </p>
      </div>

      {/* Basics */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Competition</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Name</p>
            <p className="font-semibold text-foreground">{name}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</p>
            <p className="font-semibold text-foreground capitalize">{competitionType || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Venue</p>
            <p className="text-foreground">{venue || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Host Gym</p>
            <p className="text-foreground">{hostGym || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Start</p>
            <p className="text-foreground">{fmt(startDate)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">End</p>
            <p className="text-foreground">{fmt(endDate)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reg Deadline</p>
            <p className="text-foreground">{fmt(regDeadline)}</p>
          </div>
        </div>
      </div>

      {/* Divisions */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Divisions ({divisions.length})
          </h3>
        </div>
        {divisions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {divisions.map((d) => (
              <Badge key={d} variant="secondary" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                {d}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No divisions added.</p>
        )}
      </div>

      {/* Workouts */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Workouts ({workouts.length})
          </h3>
        </div>
        {workouts.length > 0 ? (
          <div className="space-y-2">
            {workouts.map((w, i) => (
              <div
                key={w.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50"
              >
                <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{i + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {w.name || `Workout ${i + 1}`}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {w.workout_type.replace("_", " ").toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Score: {w.scoring_type}
                    </Badge>
                    {w.time_cap_minutes && (
                      <span className="text-[10px] text-muted-foreground">{w.time_cap_minutes} min</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No workouts — you can add them later from the dashboard.</p>
        )}
      </div>

      {/* Scoring + Registration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Ranking</h3>
          </div>
          <p className="text-sm text-foreground">
            {rankingDirection === "desc" ? "Highest Points Wins" : "Lowest Points Wins"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Registration</h3>
          </div>
          <div className="text-sm space-y-0.5">
            <p className="text-foreground">
              Athletes: {registration.maxAthletes ?? "Unlimited"}
            </p>
            <p className="text-foreground">
              Teams: {registration.maxTeams ?? "Unlimited"}
            </p>
            <p className="text-foreground">
              Waitlist: {registration.waitlistEnabled ? "On" : "Off"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
