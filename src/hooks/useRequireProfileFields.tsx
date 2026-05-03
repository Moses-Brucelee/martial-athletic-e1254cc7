import { ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DateOfBirthPicker } from "@/components/ui/DateOfBirthPicker";
import { toast } from "sonner";
import {
  PROFILE_FIELD_DEFS,
  isProfileComplete,
  missingProfileFields,
  type ProfileFieldKey,
} from "@/lib/profileCompletion";

// ── Context ──────────────────────────────────────────────────────────

interface PromptRequest {
  fields: ProfileFieldKey[];
  resolve: (filledAll: boolean) => void;
}

interface RequireProfileFieldsCtx {
  /**
   * Imperatively prompt for the listed fields. Resolves to `true` once the
   * user has filled every requested field and the save succeeded. Resolves
   * to `false` if they cancel.
   */
  request: (fields: ProfileFieldKey[]) => Promise<boolean>;
}

const Ctx = createContext<RequireProfileFieldsCtx | null>(null);

// ── Provider + Modal ─────────────────────────────────────────────────

export function ProfileFieldsPromptProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { profile, refetch } = useProfile();
  const [pending, setPending] = useState<PromptRequest | null>(null);
  const queueRef = useRef<PromptRequest[]>([]);

  const advance = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    setPending(next);
  }, []);

  const request = useCallback<RequireProfileFieldsCtx["request"]>((fields) => {
    return new Promise<boolean>((resolve) => {
      // If already filled, resolve synchronously.
      const stillMissing = missingProfileFields(profile, fields);
      if (stillMissing.length === 0) {
        resolve(true);
        return;
      }
      const req: PromptRequest = { fields, resolve };
      if (pending) {
        queueRef.current.push(req);
      } else {
        setPending(req);
      }
    });
  }, [pending, profile]);

  const value = useMemo(() => ({ request }), [request]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <ProfileFieldsPromptDialog
        request={pending}
        userId={user?.id ?? null}
        profile={profile}
        onClose={(success) => {
          if (pending) pending.resolve(success);
          if (success) refetch();
          advance();
        }}
      />
    </Ctx.Provider>
  );
}

export function useRequireProfileFields(defaultFields?: ProfileFieldKey[]) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRequireProfileFields must be used inside <ProfileFieldsPromptProvider>");
  return useCallback(
    (fields?: ProfileFieldKey[]) => ctx.request(fields ?? defaultFields ?? []),
    [ctx, defaultFields],
  );
}

// ── Dialog implementation ────────────────────────────────────────────

interface DialogProps {
  request: PromptRequest | null;
  userId: string | null;
  profile: Record<string, unknown> | null;
  onClose: (success: boolean) => void;
}

function ProfileFieldsPromptDialog({ request, userId, profile, onClose }: DialogProps) {
  const open = !!request;
  const fields = request?.fields ?? [];
  // Only ask for the ones that are still empty.
  const targetFields = open ? missingProfileFields(profile ?? null, fields) : [];

  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset local state every time a new request opens.
  const requestKey = request ? request.fields.join(",") : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    setValues({});
    setError(null);
  }, [requestKey]);

  if (!open || !request) {
    return (
      <Dialog open={false} onOpenChange={() => undefined}>
        <DialogContent />
      </Dialog>
    );
  }

  const handleChange = (key: ProfileFieldKey, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const allFilled = targetFields.every((k) => (values[k] ?? "").toString().trim().length > 0);

  const handleSave = async () => {
    if (!userId || !allFilled) return;
    setSaving(true);
    setError(null);

    const updates: Record<string, unknown> = {};
    for (const key of targetFields) {
      const v = values[key].trim();
      updates[key] = v;
      if (key === "display_name") updates.full_name = v;
    }

    // Recompute completeness against the merged profile.
    const merged = { ...(profile ?? {}), ...updates };
    updates.profile_completed = isProfileComplete(merged as never);

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", userId);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    toast.success("Saved");
    onClose(true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>A quick detail before we continue</DialogTitle>
          <DialogDescription>
            We just need a couple of fields to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {targetFields.map((key) => {
            const def = PROFILE_FIELD_DEFS.find((f) => f.key === key);
            if (!def) return null;
            const value = values[key] ?? "";

            return (
              <div key={key} className="space-y-2">
                <Label htmlFor={`req-${key}`} className="text-sm font-medium">
                  {def.label}
                </Label>

                {def.inputKind === "text" && (
                  <Input
                    id={`req-${key}`}
                    value={value}
                    maxLength={100}
                    onChange={(e) => handleChange(key, e.target.value)}
                    disabled={saving}
                  />
                )}

                {def.inputKind === "textarea" && (
                  <Textarea
                    id={`req-${key}`}
                    value={value}
                    maxLength={500}
                    onChange={(e) => handleChange(key, e.target.value)}
                    disabled={saving}
                  />
                )}

                {def.inputKind === "select" && key === "gender" && (
                  <Select value={value} onValueChange={(v) => handleChange(key, v)} disabled={saving}>
                    <SelectTrigger id={`req-${key}`}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {def.inputKind === "date" && (
                  <DateOfBirthPicker
                    value={value || undefined}
                    onChange={(v) => handleChange(key, v ?? "")}
                    disabled={saving}
                  />
                )}
              </div>
            );
          })}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onClose(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!allFilled || saving}>
            {saving ? "Saving…" : "Save & continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
