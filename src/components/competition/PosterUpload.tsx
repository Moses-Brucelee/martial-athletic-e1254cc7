import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ImagePlus, Trash2, Loader2, Image as ImageIcon, Sparkles, Wand2, Plus, X, Check, Lock } from "lucide-react";
import { AdaptivePoster } from "@/components/competition/AdaptivePoster";
import { toast } from "sonner";
import { validateImageType } from "@/lib/validation";
import { resizeImage } from "@/lib/imageResize";
import { removeBackground } from "@/lib/removeBackground";
import {
  listSponsors,
  uploadSponsor,
  removeSponsor,
  setOfficialPosterFromUrl,
  MAX_SPONSORS,
  type SponsorAsset,
} from "@/lib/posterAssets";
import { useTier } from "@/hooks/useTier";

const STYLES = [
  { value: "bold", label: "Bold" },
  { value: "minimal", label: "Minimal" },
  { value: "retro", label: "Retro" },
  { value: "brutalist", label: "Brutalist" },
];

interface PosterUploadProps {
  competitionId: string;
  currentPosterUrl: string | null;
  onPosterUpdated: () => void;
}

export function PosterUpload({ competitionId, currentPosterUrl, onPosterUpdated }: PosterUploadProps) {
  const { isAtLeast } = useTier();
  const aiUnlocked = isAtLeast("affiliate_pro");

  const [uploading, setUploading] = useState(false);
  const [sponsors, setSponsors] = useState<SponsorAsset[]>([]);
  const [sponsorBusy, setSponsorBusy] = useState(false);
  const [style, setStyle] = useState("bold");
  const [generating, setGenerating] = useState(false);
  const [aiPreviewUrl, setAiPreviewUrl] = useState<string | null>(null);
  const [savingPoster, setSavingPoster] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const heroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listSponsors(competitionId).then(setSponsors).catch(() => {});
  }, [competitionId]);

  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownRemaining = cooldownUntil ? Math.max(0, cooldownUntil - now) : 0;
  const onCooldown = cooldownRemaining > 0;
  useEffect(() => {
    if (cooldownUntil && now >= cooldownUntil) setCooldownUntil(null);
  }, [now, cooldownUntil]);

  const formatCooldown = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.ceil(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.ceil(m / 60);
    return `${h}h`;
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateImageType(file);
    if (validationError) { toast.error(validationError); return; }
    setUploading(true);
    try {
      // Resize on the fly — accept anything, output a clean JPEG
      toast.info("Optimizing image…");
      const resized = await resizeImage(file, { maxDim: 1920, maxBytes: 1.8 * 1024 * 1024 });

      // Wipe previous hero/poster files in this competition
      const { data: rootFiles } = await supabase.storage.from("competition-posters").list(competitionId);
      const stale = (rootFiles || [])
        .filter((f) => f.name.startsWith("hero") || f.name.startsWith("poster"))
        .map((f) => `${competitionId}/${f.name}`);
      if (stale.length) await supabase.storage.from("competition-posters").remove(stale);

      const heroPath = `${competitionId}/hero.jpg`;
      const { error: heroErr } = await supabase.storage
        .from("competition-posters")
        .upload(heroPath, resized, { upsert: true, contentType: "image/jpeg" });
      if (heroErr) throw heroErr;

      const posterPath = `${competitionId}/poster.jpg`;
      const { error: posterErr } = await supabase.storage
        .from("competition-posters")
        .upload(posterPath, resized, { upsert: true, contentType: "image/jpeg" });
      if (posterErr) throw posterErr;

      const { data: urlData } = supabase.storage.from("competition-posters").getPublicUrl(posterPath);
      const posterUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("competitions").update({ poster_url: posterUrl }).eq("id", competitionId);

      toast.success("Poster uploaded!");
      onPosterUpdated();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleHeroRemove = async () => {
    setUploading(true);
    try {
      const { data: files } = await supabase.storage.from("competition-posters").list(competitionId);
      const toRemove = (files || [])
        .filter((f) => f.name.startsWith("hero") || f.name.startsWith("poster") || f.name.startsWith("ai_preview"))
        .map((f) => `${competitionId}/${f.name}`);
      if (toRemove.length) await supabase.storage.from("competition-posters").remove(toRemove);
      await supabase.from("competitions").update({ poster_url: null }).eq("id", competitionId);
      setAiPreviewUrl(null);
      toast.success("Poster removed");
      onPosterUpdated();
    } catch (err: any) {
      toast.error(err.message || "Remove failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSponsorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (sponsors.length >= MAX_SPONSORS) {
      toast.error(`Max ${MAX_SPONSORS} sponsors`);
      return;
    }
    const validationError = validateImageFile(file);
    if (validationError) { toast.error(validationError); return; }
    setSponsorBusy(true);
    try {
      toast.info("Removing background…");
      const transparent = await removeBackground(file);
      const baseName = (file.name.replace(/\.[^.]+$/, "") || "sponsor") + ".png";
      const asset = await uploadSponsor(competitionId, transparent, baseName);
      setSponsors((s) => [...s, asset]);
      toast.success("Sponsor added");
    } catch (err: any) {
      toast.error(err.message || "Sponsor upload failed");
    } finally {
      setSponsorBusy(false);
    }
  };

  const handleSponsorRemove = async (path: string) => {
    try {
      await removeSponsor(path);
      setSponsors((s) => s.filter((x) => x.path !== path));
    } catch (err: any) {
      toast.error(err.message || "Remove failed");
    }
  };

  const handleGenerate = async () => {
    if (!currentPosterUrl) { toast.error("Upload a hero image first"); return; }
    if (cooldownUntil && cooldownUntil > Date.now()) return;
    setGenerating(true);
    setAiPreviewUrl(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-poster`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ competitionId, style }),
      });
      const payload = await resp.json().catch(() => ({}));
      if (resp.status === 429) {
        const retryAt = payload?.retryAt ? new Date(payload.retryAt).getTime() : Date.now() + 60_000;
        setCooldownUntil(retryAt);
        toast.error(payload?.error || "Rate limit reached.");
        return;
      }
      if (resp.status === 402) {
        toast.error("AI credits exhausted. Add credits in Workspace → Usage.");
        return;
      }
      if (!resp.ok) {
        toast.error(payload?.error || "Generation failed");
        return;
      }
      setAiPreviewUrl(payload.url);
      toast.success("AI poster ready!");
    } catch (err: any) {
      toast.error(err?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleUsePoster = async () => {
    if (!aiPreviewUrl) return;
    setSavingPoster(true);
    try {
      await setOfficialPosterFromUrl(competitionId, aiPreviewUrl);
      toast.success("Saved as official poster!");
      setAiPreviewUrl(null);
      onPosterUpdated();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSavingPoster(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero / Current poster */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide">Hero Image</h3>
          {currentPosterUrl && (
            <Button variant="ghost" size="sm" onClick={handleHeroRemove} disabled={uploading}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
            </Button>
          )}
        </div>
        {currentPosterUrl ? (
          <div className="relative group rounded-xl overflow-hidden border border-border bg-background">
            <AdaptivePoster src={currentPosterUrl} alt="Competition poster" className="rounded-xl" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <label className="cursor-pointer">
                <Button variant="secondary" size="sm" asChild disabled={uploading}>
                  <span>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <ImagePlus className="h-4 w-4 mr-1.5" />}
                    Change
                  </span>
                </Button>
                <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        ) : (
          <label className="cursor-pointer block">
            <div className="border-2 border-dashed border-border rounded-xl aspect-[16/9] flex flex-col items-center justify-center gap-2 bg-muted/30 hover:bg-muted/50 hover:border-primary/40 transition-colors">
              {uploading ? (
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Upload Hero Image</span>
                  <span className="text-xs text-muted-foreground/60">Athlete, action, or venue shot</span>
                </>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} disabled={uploading} />
          </label>
        )}
      </div>

      {/* Sponsor logos */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2">
              Sponsor Logos
              {!aiUnlocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
            </h3>
            <p className="text-xs text-muted-foreground">
              Auto background-removed — transparent PNGs work best. {sponsors.length}/{MAX_SPONSORS}
            </p>
          </div>
        </div>
        {!aiUnlocked ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            Sponsor logos & AI poster generation require <strong>Affiliate Pro</strong> or higher.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {sponsors.map((s) => (
              <div key={s.path} className="relative group aspect-square rounded-lg border border-border bg-[repeating-conic-gradient(#0001_0_25%,transparent_0_50%)] [background-size:12px_12px] overflow-hidden">
                <img src={s.url} alt="sponsor" className="absolute inset-0 w-full h-full object-contain p-1" />
                <button
                  type="button"
                  onClick={() => handleSponsorRemove(s.path)}
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                  aria-label="Remove sponsor"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {sponsors.length < MAX_SPONSORS && (
              <label className="cursor-pointer aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted/40 transition flex flex-col items-center justify-center gap-1 text-muted-foreground">
                {sponsorBusy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    <span className="text-[10px]">Add sponsor</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleSponsorUpload} disabled={sponsorBusy} />
              </label>
            )}
          </div>
        )}
      </div>

      {/* AI Poster Studio */}
      {aiUnlocked && (
        <div className="space-y-3 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wide">AI Poster Studio</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Combine your hero image and sponsor logos into a stunning, branded competition poster.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleGenerate} disabled={generating || onCooldown || !currentPosterUrl} className="flex-1">
                    {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Wand2 className="h-4 w-4 mr-1.5" />}
                    {generating
                      ? "Generating…"
                      : onCooldown
                        ? `Retry in ${formatCooldown(cooldownRemaining)}`
                        : aiPreviewUrl
                          ? "Regenerate"
                          : "Generate Stunning Poster"}
                  </Button>
                </TooltipTrigger>
                {!currentPosterUrl && <TooltipContent>Upload a hero image first</TooltipContent>}
                {onCooldown && currentPosterUrl && (
                  <TooltipContent>Daily limit reached or AI cooling down</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          {aiPreviewUrl && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Original</p>
                  <img src={currentPosterUrl!} alt="original" className="w-full rounded-lg border border-border object-cover aspect-[3/4]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-primary mb-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> AI Poster
                  </p>
                  <img src={aiPreviewUrl} alt="ai poster" className="w-full rounded-lg border border-primary/40 object-cover aspect-[3/4]" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating || onCooldown} className="flex-1">
                  {onCooldown ? `Retry in ${formatCooldown(cooldownRemaining)}` : "Try again"}
                </Button>
                <Button size="sm" onClick={handleUsePoster} disabled={savingPoster} className="flex-1">
                  {savingPoster ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
                  Use this poster
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
