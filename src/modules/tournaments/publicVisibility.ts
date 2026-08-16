// Probes whether a competition is actually reachable by a signed-out visitor.
// Uses a raw REST call with only the publishable key (no Authorization header),
// so the request runs as the anonymous role exactly like a public share link.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export interface PublicVisibilityResult {
  reachable: boolean;
  reason?: string;
}

export async function probePublicVisibility(competitionId: string): Promise<PublicVisibilityResult> {
  if (!SUPABASE_URL || !PUBLISHABLE_KEY) return { reachable: true };
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/competitions?select=id&id=eq.${encodeURIComponent(competitionId)}`,
      { headers: { apikey: PUBLISHABLE_KEY } },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { reachable: false, reason: body?.message || `HTTP ${res.status}` };
    }
    const rows = (await res.json()) as unknown[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return { reachable: false, reason: "The event row is not visible to signed-out visitors." };
    }
    return { reachable: true };
  } catch (e) {
    return { reachable: false, reason: (e as Error).message };
  }
}
