import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllFeatureFlags } from "@/hooks/useFeatureFlag";
import {
  FEATURE_FLAG_DEFAULTS,
  FEATURE_FLAG_LABELS,
  resolveStaticFlag,
  type FeatureFlagKey,
} from "@/lib/featureFlags";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AUDIENCES = ["all", "super_users", "organizers", "beta"] as const;

export function FeatureFlagsManager() {
  const { data, isLoading } = useAllFeatureFlags();
  const queryClient = useQueryClient();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const updateFlag = async (
    key: FeatureFlagKey,
    patch: { enabled?: boolean | null; audience?: string },
  ) => {
    setSavingKey(key);
    const existing = data?.[key];
    const payload = {
      key,
      enabled: patch.enabled !== undefined ? patch.enabled : existing?.enabled ?? null,
      audience: patch.audience ?? existing?.audience ?? "all",
      description: FEATURE_FLAG_LABELS[key],
    };
    const { error } = await supabase.from("feature_flags").upsert(payload);
    setSavingKey(null);
    if (error) {
      toast.error("Failed to update flag", { description: error.message });
      return;
    }
    toast.success(`Updated "${key}"`);
    queryClient.invalidateQueries({ queryKey: ["feature_flags"] });
  };

  const flagKeys = Object.keys(FEATURE_FLAG_DEFAULTS) as FeatureFlagKey[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Flags</CardTitle>
        <CardDescription>
          Toggle features live across the platform. Super users always see all features.
          Disabled flags are hidden from regular users immediately (after their next page load).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </>
        ) : (
          flagKeys.map((key) => {
            const row = data?.[key];
            const dbValue = row?.enabled;
            const effectiveDb = dbValue !== null && dbValue !== undefined;
            const effective = effectiveDb ? !!dbValue : resolveStaticFlag(key);
            const audience = row?.audience ?? "all";
            const isSaving = savingKey === key;

            return (
              <div
                key={key}
                className="flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-mono font-semibold">{key}</code>
                    {effective ? (
                      <Badge variant="default" className="text-[10px]">ON</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">OFF</Badge>
                    )}
                    {!effectiveDb && (
                      <Badge variant="outline" className="text-[10px]">
                        using default
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {FEATURE_FLAG_LABELS[key]}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Select
                    value={audience}
                    onValueChange={(v) => updateFlag(key, { audience: v })}
                    disabled={isSaving}
                  >
                    <SelectTrigger className="w-[140px] h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map((a) => (
                        <SelectItem key={a} value={a} className="text-xs">
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={effective}
                      disabled={isSaving}
                      onCheckedChange={(checked) => updateFlag(key, { enabled: checked })}
                    />
                    {effectiveDb && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[10px] h-7 px-2"
                        disabled={isSaving}
                        onClick={() => updateFlag(key, { enabled: null })}
                        title="Reset to code/env default"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
