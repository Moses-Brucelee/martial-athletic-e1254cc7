import { supabase } from "@/integrations/supabase/client";

const BUCKET = "competition-posters";

export interface SponsorAsset {
  name: string;
  path: string;
  url: string;
  websiteUrl: string | null;
  clickCount: number;
  /** Set when this sponsor is a linked platform shop (logo comes from the shop profile). */
  shopId?: string | null;
  shopName?: string | null;
}

export const MAX_SPONSORS = 6;

function publicUrl(path: string) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function listSponsors(competitionId: string): Promise<SponsorAsset[]> {
  const linked = await listLinkedShopSponsors(competitionId);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(`${competitionId}/sponsors`, {
      limit: 100,
      sortBy: { column: "name", order: "asc" },
    });
  if (error || !data) return linked;

  const items = data
    .filter((f) => f.name && !f.name.startsWith("."))
    // Deterministic order so mobile and desktop render identically across
    // browsers/CDN caches. Storage `sortBy` is best-effort — re-sort client-side.
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((f) => {
      const path = `${competitionId}/sponsors/${f.name}`;
      return { name: f.name, path, url: publicUrl(path) };
    });

  if (items.length === 0) return linked;

  const { data: meta } = await supabase
    .from("competition_sponsors_meta")
    .select("storage_path, website_url, click_count")
    .in("storage_path", items.map((i) => i.path));

  const metaByPath = new Map(
    (meta ?? []).map((m: any) => [m.storage_path, m])
  );

  const uploaded = items.map((i) => {
    const m = metaByPath.get(i.path);
    return {
      ...i,
      websiteUrl: m?.website_url ?? null,
      clickCount: m?.click_count ?? 0,
    };
  });
  return [...linked, ...uploaded];
}

/** Linked shop sponsors, ordered by shop name for deterministic rendering. */
export async function listLinkedShopSponsors(competitionId: string): Promise<SponsorAsset[]> {
  const { data } = await supabase
    .from("competition_sponsors_meta")
    .select("storage_path, website_url, click_count, shop_id, shop_profiles(shop_name, logo_url, website_url)")
    .eq("competition_id", competitionId)
    .not("shop_id", "is", null);
  return ((data ?? []) as any[])
    .filter((r) => r.shop_profiles?.logo_url)
    .map((r) => ({
      name: r.shop_profiles.shop_name,
      path: r.storage_path,
      url: r.shop_profiles.logo_url,
      websiteUrl: r.website_url ?? r.shop_profiles.website_url ?? null,
      clickCount: r.click_count ?? 0,
      shopId: r.shop_id,
      shopName: r.shop_profiles.shop_name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function linkShopSponsor(competitionId: string, shop: { id: string; website_url: string | null }) {
  const path = `shop:${competitionId}:${shop.id}`;
  const { error } = await supabase.from("competition_sponsors_meta").insert({
    competition_id: competitionId,
    storage_path: path,
    website_url: shop.website_url,
    shop_id: shop.id,
  });
  if (error) throw error;
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
  return { name: safe, path, url: publicUrl(path), websiteUrl: null, clickCount: 0 };
}

export async function removeSponsor(competitionId: string, path: string) {
  if (path.startsWith("shop:")) {
    const { error } = await supabase.from("competition_sponsors_meta").delete().eq("storage_path", path);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
  await supabase.from("competition_sponsors_meta").delete().eq("storage_path", path);
}

export async function setSponsorWebsiteUrl(
  competitionId: string,
  path: string,
  websiteUrl: string | null
) {
  const url = websiteUrl?.trim() || null;
  // Upsert by storage_path
  const { error } = await supabase
    .from("competition_sponsors_meta")
    .upsert(
      { competition_id: competitionId, storage_path: path, website_url: url },
      { onConflict: "storage_path" }
    );
  if (error) throw error;
}

export async function trackSponsorClick(
  competitionId: string,
  path: string,
  websiteUrl: string
) {
  await supabase.rpc("increment_sponsor_click", {
    p_competition_id: competitionId,
    p_storage_path: path,
    p_website_url: websiteUrl,
  });
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
