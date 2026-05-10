import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STYLE_PROMPTS: Record<string, string> = {
  bold:
    "BOLD dramatic sports event poster. Cinematic high-contrast lighting, electric red and deep charcoal palette, motion blur, oversized condensed sans-serif typography, gritty texture.",
  minimal:
    "Minimal premium sports poster. Generous negative space, single accent color, thin geometric type, refined editorial layout.",
  retro:
    "Retro 1980s sports poster. Halftone grain, neon magenta and cyan, chunky display type, sun-burst rays, VHS feel.",
  brutalist:
    "Brutalist sports poster. Massive blocky black & white typography, raw edges, asymmetric grid, photocopy texture, high contrast monochrome.",
};

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "image/png";
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return `data:${ct};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const competitionId = String(body.competitionId || "");
    const style = String(body.style || "bold").toLowerCase();
    if (!competitionId || !STYLE_PROMPTS[style]) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: must own the competition
    const { data: ownerOk } = await admin.rpc("is_competition_owner", {
      p_user_id: userId,
      p_competition_id: competitionId,
    });
    const { data: superOk } = await admin.rpc("is_super_user", { p_user_id: userId });
    if (!ownerOk && !superOk) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tier gate (skip for super users)
    if (!superOk) {
      const { data: tierOk } = await userClient.rpc("user_tier_at_least", {
        min_tier: "affiliate_pro",
      });
      if (!tierOk) {
        return new Response(
          JSON.stringify({ error: "Affiliate Pro tier or higher required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Daily quota: 10 generations per 24h (super users unlimited)
    const DAILY_LIMIT = 10;
    if (!superOk) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, data: recent } = await admin
        .from("ai_poster_generations")
        .select("created_at", { count: "exact" })
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: true })
        .limit(DAILY_LIMIT);
      if ((count ?? 0) >= DAILY_LIMIT) {
        const oldest = recent?.[0]?.created_at;
        const retryAt = oldest
          ? new Date(new Date(oldest).getTime() + 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 60 * 60 * 1000).toISOString();
        const retryAfter = Math.max(1, Math.ceil((new Date(retryAt).getTime() - Date.now()) / 1000));
        return new Response(
          JSON.stringify({
            error: `Daily limit of ${DAILY_LIMIT} AI posters reached. Try again later.`,
            retryAt,
            limit: DAILY_LIMIT,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Retry-After": String(retryAfter),
            },
          }
        );
      }
    }
    // Load competition meta
    const { data: comp, error: compErr } = await admin
      .from("competitions")
      .select("name, start_date, end_date, venue")
      .eq("id", competitionId)
      .maybeSingle();
    if (compErr || !comp) throw new Error("Competition not found");

    // List assets
    const { data: rootFiles } = await admin.storage
      .from("competition-posters")
      .list(competitionId, { limit: 50 });
    const heroFile = rootFiles?.find((f) => f.name.startsWith("hero"));
    const heroPath = heroFile ? `${competitionId}/${heroFile.name}` : null;

    const { data: sponsorFiles } = await admin.storage
      .from("competition-posters")
      .list(`${competitionId}/sponsors`, { limit: 20 });

    const heroUrl = heroPath
      ? admin.storage.from("competition-posters").getPublicUrl(heroPath).data.publicUrl
      : null;
    const sponsorUrls = (sponsorFiles || [])
      .filter((f) => f.name && !f.name.startsWith("."))
      .slice(0, 6)
      .map(
        (f) =>
          admin.storage
            .from("competition-posters")
            .getPublicUrl(`${competitionId}/sponsors/${f.name}`).data.publicUrl
      );

    const heroData = heroUrl ? await fetchAsDataUrl(heroUrl) : null;
    const sponsorData: string[] = [];
    for (const u of sponsorUrls) {
      const d = await fetchAsDataUrl(u);
      if (d) sponsorData.push(d);
    }

    const dateText = comp.start_date
      ? new Date(comp.start_date).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";
    const venue = comp.venue || "";

    const promptText = `${STYLE_PROMPTS[style]}

Compose a STUNNING competitive sports event poster (portrait 3:4) for:

TITLE: ${comp.name}
DATE: ${dateText}
${venue ? `VENUE: ${venue}` : ""}

Use the first attached image as the focal hero subject (athlete / action / venue). ${
      sponsorData.length
        ? `Place the ${sponsorData.length} attached sponsor logo${
            sponsorData.length > 1 ? "s" : ""
          } in a clean evenly-spaced horizontal strip across the bottom of the poster — preserve their original colors, do not distort, do not crop, leave generous padding.`
        : ""
    }

Render the title in HUGE legible typography. Include date and venue clearly. Make it feel premium, dramatic, and unmistakably sportive.`;

    const content: any[] = [{ type: "text", text: promptText }];
    if (heroData) content.push({ type: "image_url", image_url: { url: heroData } });
    for (const s of sponsorData) content.push({ type: "image_url", image_url: { url: s } });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) {
        const ra = aiResp.headers.get("retry-after");
        const seconds = ra ? parseInt(ra, 10) || 60 : 60;
        const retryAt = new Date(Date.now() + seconds * 1000).toISOString();
        return new Response(
          JSON.stringify({ error: "AI service rate limit reached. Try again shortly.", retryAt }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(seconds) },
          }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI generation failed");
    }

    const aiJson = await aiResp.json();
    const imgDataUrl: string | undefined =
      aiJson?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imgDataUrl) throw new Error("No image returned by AI");

    // Decode and store as preview
    const base64 = imgDataUrl.split(",")[1];
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    const previewPath = `${competitionId}/ai_preview_${Date.now()}.png`;
    const { error: upErr } = await admin.storage
      .from("competition-posters")
      .upload(previewPath, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw upErr;

    const { data: urlData } = admin.storage.from("competition-posters").getPublicUrl(previewPath);
    const previewUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    // Log successful generation toward daily quota
    await admin
      .from("ai_poster_generations")
      .insert({ user_id: userId, competition_id: competitionId });

    return new Response(JSON.stringify({ url: previewUrl, path: previewPath }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("generate-poster error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
