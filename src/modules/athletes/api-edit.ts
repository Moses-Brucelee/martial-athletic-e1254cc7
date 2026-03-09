import { supabase } from "@/integrations/supabase/client";
import type { Athlete } from "@/domain/competition";

/** Update an athlete's editable fields */
export async function updateAthlete(
  athleteId: string,
  updates: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
  }
): Promise<Athlete> {
  const { data, error } = await supabase
    .from("athletes")
    .update(updates)
    .eq("id", athleteId)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Athlete;
}
