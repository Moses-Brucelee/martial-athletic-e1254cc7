import { supabase } from "@/integrations/supabase/client";

export interface HeatJudge {
  id: string;
  heat_id: string;
  judge_id: string;
  display_name?: string | null;
}

export async function fetchHeatJudges(competitionId: string): Promise<HeatJudge[]> {
  // Get all heats for competition, then all heat_judges joined with judges
  const { data, error } = await (supabase as any)
    .from("heat_judges")
    .select("id, heat_id, judge_id, competition_judges!heat_judges_judge_id_fkey(display_name, user_id)");
  if (error) throw error;
  // We need to filter to this competition — easier: pull heats list then filter
  const { data: heats } = await supabase
    .from("heat_schedule")
    .select("id")
    .eq("competition_id", competitionId);
  const heatIds = new Set((heats ?? []).map((h: any) => h.id));
  return ((data ?? []) as any[])
    .filter((r) => heatIds.has(r.heat_id))
    .map((r) => ({
      id: r.id,
      heat_id: r.heat_id,
      judge_id: r.judge_id,
      display_name: r.competition_judges?.display_name ?? null,
    }));
}

export async function assignHeatJudge(heatId: string, judgeId: string): Promise<HeatJudge> {
  const { data, error } = await (supabase as any)
    .from("heat_judges")
    .insert({ heat_id: heatId, judge_id: judgeId })
    .select()
    .single();
  if (error) throw error;
  return data as HeatJudge;
}

export async function unassignHeatJudge(id: string): Promise<void> {
  const { error } = await (supabase as any).from("heat_judges").delete().eq("id", id);
  if (error) throw error;
}
