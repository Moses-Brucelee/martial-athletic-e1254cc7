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

/** Find unlinked athletes matching by email (no user_id set) */
export async function findUnlinkedAthletes(email: string): Promise<Athlete[]> {
  const { data, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("email", email)
    .is("user_id", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Athlete[];
}

/** Find unlinked athletes by name (fuzzy) */
export async function findUnlinkedAthletesByName(name: string): Promise<Athlete[]> {
  const { data, error } = await supabase
    .from("athletes")
    .select("*")
    .is("user_id", null)
    .ilike("name", `%${name}%`)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as unknown as Athlete[];
}

/** Claim an athlete profile — link to current user */
export async function claimAthleteProfile(athleteId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("athletes")
    .update({ user_id: userId })
    .eq("id", athleteId)
    .is("user_id", null); // safety: only claim unclaimed
  if (error) throw error;
}

/** Get athlete profiles linked to a user */
export async function getLinkedAthletes(userId: string): Promise<Athlete[]> {
  const { data, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("user_id", userId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as unknown as Athlete[];
}

/** Get competition history for an athlete (by user_id from registrations) */
export async function fetchCompetitionHistory(userId: string) {
  // Get registrations where user_id matches OR athlete_id is linked
  const { data: regs, error: regErr } = await supabase
    .from("athlete_registrations")
    .select("*, competitions!athlete_registrations_competition_id_fkey(id, name, start_date, end_date, venue, poster_url, status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (regErr) throw regErr;
  return (regs ?? []) as unknown as (AthleteRegistration & {
    competitions: { id: string; name: string; start_date: string | null; end_date: string | null; venue: string | null; poster_url: string | null; status: string } | null;
  })[];
}

/** Get scores for a user across all competitions */
export async function fetchAthleteScores(userId: string) {
  // First get team IDs the user is associated with
  const { data: participants, error: pErr } = await supabase
    .from("competition_participants")
    .select("team_id, competition_id")
    .eq("user_id", userId);
  if (pErr) throw pErr;

  if (!participants || participants.length === 0) return [];

  const teamIds = [...new Set(participants.map((p) => p.team_id))];

  const { data: scores, error: sErr } = await supabase
    .from("competition_scores")
    .select("*, competition_workouts!competition_scores_workout_id_fkey(name, workout_number, scoring_type, workout_type)")
    .in("team_id", teamIds)
    .order("created_at", { ascending: false });
  if (sErr) throw sErr;
  return scores ?? [];
}

/** Search athletes for merge (admin) */
export async function searchAthletesForMerge(query: string): Promise<Athlete[]> {
  const { data, error } = await supabase
    .from("athletes")
    .select("*")
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .order("name")
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as Athlete[];
}

/** Merge two athlete records: keep primary, transfer registrations from secondary, delete secondary */
export async function mergeAthletes(primaryId: string, secondaryId: string): Promise<void> {
  // Update all registrations from secondary to primary
  const { error: regErr } = await supabase
    .from("athlete_registrations")
    .update({ athlete_id: primaryId })
    .eq("athlete_id", secondaryId);
  if (regErr) throw regErr;

  // Delete secondary
  const { error: delErr } = await supabase
    .from("athletes")
    .delete()
    .eq("id", secondaryId);
  if (delErr) throw delErr;
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

export async function updateRegistrationDetails(
  id: string,
  updates: {
    athlete_name?: string;
    email?: string | null;
    phone?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
    notes?: string | null;
  }
): Promise<AthleteRegistration> {
  const { data, error } = await supabase
    .from("athlete_registrations")
    .update(updates)
    .eq("id", id)
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

export async function updateRegistrationTeam(
  id: string,
  teamId: string | null
): Promise<void> {
  const { error } = await supabase
    .from("athlete_registrations")
    .update({ team_id: teamId })
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

export async function deleteRegistration(id: string): Promise<void> {
  const { error } = await supabase
    .from("athlete_registrations")
    .delete()
    .eq("id", id);
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
