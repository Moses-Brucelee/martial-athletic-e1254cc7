import { supabase } from "@/integrations/supabase/client";
import type { Participant } from "@/domain/competition";

export async function fetchParticipants(competitionId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from("competition_participants")
    .select("*")
    .eq("competition_id", competitionId)
    .order("created_at");

  if (error) throw error;
  return data as Participant[];
}

export async function addParticipant(
  competitionId: string,
  teamId: string,
  athleteName: string,
  userId?: string
): Promise<Participant> {
  const { data, error } = await supabase
    .from("competition_participants")
    .insert({
      competition_id: competitionId,
      team_id: teamId,
      athlete_name: athleteName,
      user_id: userId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Participant;
}

export async function removeParticipant(participantId: string): Promise<void> {
  const { error } = await supabase
    .from("competition_participants")
    .delete()
    .eq("id", participantId);

  if (error) throw error;
}

export async function selfRegister(
  competitionId: string,
  teamId: string,
  userId: string,
  athleteName: string
): Promise<Participant> {
  return addParticipant(competitionId, teamId, athleteName, userId);
}
