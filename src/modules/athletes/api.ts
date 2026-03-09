import { supabase } from "@/integrations/supabase/client";
import type { Athlete, AthleteRegistration } from "@/domain/competition";

// ── Participants (legacy) ─────────────────────────────────
export {
  fetchParticipants,
  addParticipant,
  removeParticipant,
  selfRegister,
} from "@/data/participants";

// ── Athletes ──────────────────────────────────────────────

export async function fetchAthletes(): Promise<Athlete[]> {
  const { data, error } = await supabase
    .from("athletes")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as unknown as Athlete[];
}

export async function createAthlete(athlete: {
  name: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  user_id?: string | null;
  created_by_user_id?: string | null;
}): Promise<Athlete> {
  const { data, error } = await supabase
    .from("athletes")
    .insert(athlete)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Athlete;
}

export async function findAthleteByEmail(email: string): Promise<Athlete | null> {
  const { data, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Athlete | null;
}

// ── Registrations (extended) ──────────────────────────────

export async function fetchRegistrations(competitionId: string): Promise<AthleteRegistration[]> {
  const { data, error } = await supabase
    .from("athlete_registrations")
    .select("*")
    .eq("competition_id", competitionId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as unknown as AthleteRegistration[];
}

export async function createRegistration(reg: {
  competition_id: string;
  athlete_name: string;
  user_id?: string | null;
  athlete_id?: string | null;
  team_id?: string | null;
  division_id?: string | null;
  registered_by_user_id?: string | null;
  registration_type?: string;
  status?: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  notes?: string | null;
}): Promise<AthleteRegistration> {
  const { data, error } = await supabase
    .from("athlete_registrations")
    .insert({
      competition_id: reg.competition_id,
      athlete_name: reg.athlete_name,
      user_id: reg.user_id ?? null,
      athlete_id: reg.athlete_id ?? null,
      team_id: reg.team_id ?? null,
      division_id: reg.division_id ?? null,
      registered_by_user_id: reg.registered_by_user_id ?? null,
      registration_type: reg.registration_type ?? "self",
      status: reg.status ?? "pending",
      email: reg.email ?? null,
      phone: reg.phone ?? null,
      gender: reg.gender ?? null,
      date_of_birth: reg.date_of_birth ?? null,
      notes: reg.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as AthleteRegistration;
}

export async function updateRegistrationStatus(
  id: string,
  status: string
): Promise<void> {
  const { error } = await supabase
    .from("athlete_registrations")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function updateRegistrationDivision(
  id: string,
  divisionId: string
): Promise<void> {
  const { error } = await supabase
    .from("athlete_registrations")
    .update({ division_id: divisionId })
    .eq("id", id);
  if (error) throw error;
}

export async function bulkUpdateStatus(
  ids: string[],
  status: string
): Promise<void> {
  const { error } = await supabase
    .from("athlete_registrations")
    .update({ status })
    .in("id", ids);
  if (error) throw error;
}

export async function checkDuplicateRegistration(
  competitionId: string,
  userId?: string | null,
  email?: string | null
): Promise<boolean> {
  let query = supabase
    .from("athlete_registrations")
    .select("id")
    .eq("competition_id", competitionId);

  if (userId) {
    query = query.eq("user_id", userId);
  } else if (email) {
    query = query.eq("email", email);
  } else {
    return false;
  }

  const { data } = await query.limit(1);
  return (data?.length ?? 0) > 0;
}
