import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlus, Trash2, Loader2, Image } from "lucide-react";
import { toast } from "sonner";
import { validateImageFile } from "@/lib/validation";

interface PosterUploadProps {
  competitionId: string;
  currentPosterUrl: string | null;
  onPosterUpdated: () => void;
}

export function PosterUpload({ competitionId, currentPosterUrl, onPosterUpdated }: PosterUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) { toast.error(validationError); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${competitionId}/poster.${ext}`;
      await supabase.storage.from("competition-posters").remove([path]);
      const { error: uploadErr } = await supabase.storage.from("competition-posters").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("competition-posters").getPublicUrl(path);
      const posterUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateErr } = await supabase.from("competitions").update({ poster_url: posterUrl }).eq("id", competitionId);
      if (updateErr) throw updateErr;
      toast.success("Poster uploaded!");
      onPosterUpdated();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      const { data: files } = await supabase.storage.from("competition-posters").list(competitionId);
      if (files?.length) {
        await supabase.storage.from("competition-posters").remove(files.map((f) => `${competitionId}/${f.name}`));
      }
      const { error } = await supabase.from("competitions").update({ poster_url: null }).eq("id", competitionId);
      if (error) throw error;
      toast.success("Poster removed");
      onPosterUpdated();
    } catch (err: any) {
      toast.error(err.message || "Remove failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {currentPosterUrl ? (
        <div className="relative group rounded-xl overflow-hidden border border-border bg-background">
          <img
            src={currentPosterUrl}
            alt="Competition poster"
            className="w-full aspect-[16/9] object-cover"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <label className="cursor-pointer">
              <Button variant="secondary" size="sm" asChild disabled={uploading}>
                <span>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <ImagePlus className="h-4 w-4 mr-1.5" />}
                  Change
                </span>
              </Button>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
            <Button variant="destructive" size="sm" onClick={handleRemove} disabled={uploading}>
              <Trash2 className="h-4 w-4 mr-1.5" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <div className="border-2 border-dashed border-border rounded-xl aspect-[16/9] flex flex-col items-center justify-center gap-2 bg-muted/30 hover:bg-muted/50 hover:border-primary/40 transition-colors">
            {uploading ? (
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            ) : (
              <>
                <Image className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Upload Poster</span>
                <span className="text-xs text-muted-foreground/60">16:9 recommended</span>
              </>
            )}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      )}
    </div>
  );
}
