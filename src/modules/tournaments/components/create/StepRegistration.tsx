import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, ShieldCheck } from "lucide-react";

export interface RegistrationConfig {
  maxAthletes: number | null;
  maxTeams: number | null;
  waitlistEnabled: boolean;
}

export function defaultRegistrationConfig(): RegistrationConfig {
  return {
    maxAthletes: null,
    maxTeams: null,
    waitlistEnabled: true,
  };
}

interface StepRegistrationProps {
  config: RegistrationConfig;
  setConfig: React.Dispatch<React.SetStateAction<RegistrationConfig>>;
  disabled?: boolean;
}

export function StepRegistration({ config, setConfig, disabled }: StepRegistrationProps) {
  return (
    <div className="space-y-6">
      {/* Capacity */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Capacity Limits</h3>
        </div>
        <p className="text-xs text-muted-foreground">Leave blank for unlimited.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground font-medium text-sm">Max Athletes</Label>
            <Input
              type="number"
              min={1}
              value={config.maxAthletes ?? ""}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  maxAthletes: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              placeholder="Unlimited"
              className="h-10 bg-background text-sm"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground font-medium text-sm">Max Teams</Label>
            <Input
              type="number"
              min={1}
              value={config.maxTeams ?? ""}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  maxTeams: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              placeholder="Unlimited"
              className="h-10 bg-background text-sm"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Waitlist */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Enable Waitlist</p>
              <p className="text-xs text-muted-foreground">
                Auto-promote athletes when spots open up
              </p>
            </div>
          </div>
          <Switch
            checked={config.waitlistEnabled}
            onCheckedChange={(v) => setConfig((prev) => ({ ...prev, waitlistEnabled: v }))}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Info */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">💡 Registration dates</strong> were set in Step 1.
          Athletes can register from now until the deadline you configured.
        </p>
      </div>
    </div>
  );
}
