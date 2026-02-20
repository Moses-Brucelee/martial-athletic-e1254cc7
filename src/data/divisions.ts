import { supabase } from "@/integrations/supabase/client";
import type { Division } from "@/domain/competition";

export async function fetchDivisions(competitionId: string): Promise<Division[]> {
  const { data, error } = await supabase
    .from("competition_divisions")
    .select("*")
    .eq("competition_id", competitionId)
    .order("sort_order");

  if (error) throw error;
  return data as Division[];
}

export async function addDivision(competitionId: string, name: string, sortOrder: number): Promise<Division> {
  const { data, error } = await supabase
    .from("competition_divisions")
    .insert({ competition_id: competitionId, name, sort_order: sortOrder })
    .select()
    .single();

  if (error) throw error;
  return data as Division;
}

export async function updateDivision(divisionId: string, updates: { name?: string; sort_order?: number }): Promise<void> {
  const { error } = await supabase
    .from("competition_divisions")
    .update(updates)
    .eq("id", divisionId);

  if (error) throw error;
}

export async function removeDivision(divisionId: string): Promise<void> {
  const { error } = await supabase
    .from("competition_divisions")
    .delete()
    .eq("id", divisionId);

  if (error) throw error;
}
