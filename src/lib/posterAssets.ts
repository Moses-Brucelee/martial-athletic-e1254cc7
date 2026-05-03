import { supabase } from "@/integrations/supabase/client";

const BUCKET = "competition-posters";

export interface SponsorAsset {
  name: string;
  path: string;
  url: string;
}

export const MAX_SPONSORS = 6;

function publicUrl(path: string) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function listSponsors(competitionId: string): Promise<SponsorAsset[]> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(`${competitionId}/sponsors`, { limit: 100 });
  if (error || !data) return [];
  return data
    .filter((f) => f.name && !f.name.startsWith("."))
    .map((f) => {
      const path = `${competitionId}/sponsors/${f.name}`;
      return { name: f.name, path, url: publicUrl(path) };
    });
}

export async function uploadSponsor(
  competitionId: string,
  file: Blob,
  filename: string
): Promise<SponsorAsset> {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${competitionId}/sponsors/${Date.now()}_${safe}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: "image/png" });
  if (error) throw error;
  return { name: safe, path, url: publicUrl(path) };
}

export async function removeSponsor(path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export async function setOfficialPosterFromUrl(competitionId: string, sourceUrl: string) {
  const res = await fetch(sourceUrl);
  const blob = await res.blob();
  const path = `${competitionId}/poster.png`;
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: "image/png" });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const finalUrl = `${data.publicUrl}?t=${Date.now()}`;
  const { error: updErr } = await supabase
    .from("competitions")
    .update({ poster_url: finalUrl })
    .eq("id", competitionId);
  if (updErr) throw updErr;
  return finalUrl;
}
