import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
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
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${competitionId}/poster.${ext}`;

      // Remove old file if exists
      await supabase.storage.from("competition-posters").remove([path]);

      const { error: uploadErr } = await supabase.storage
        .from("competition-posters")
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("competition-posters")
        .getPublicUrl(path);

      const posterUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase
        .from("competitions")
        .update({ poster_url: posterUrl })
        .eq("id", competitionId);
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
      // List and remove all files in the competition folder
      const { data: files } = await supabase.storage
        .from("competition-posters")
        .list(competitionId);
      if (files?.length) {
        await supabase.storage
          .from("competition-posters")
          .remove(files.map((f) => `${competitionId}/${f.name}`));
      }

      const { error } = await supabase
        .from("competitions")
        .update({ poster_url: null })
        .eq("id", competitionId);
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
    <div className="flex items-center gap-3">
      {currentPosterUrl && (
        <img
          src={currentPosterUrl}
          alt="Competition poster"
          className="h-16 w-24 rounded-lg object-cover border border-border"
        />
      )}

      <label className="cursor-pointer">
        <Button variant="outline" size="sm" asChild disabled={uploading}>
          <span>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ImagePlus className="h-4 w-4 mr-1" />}
            {currentPosterUrl ? "Change Poster" : "Upload Poster"}
          </span>
        </Button>
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
      </label>

      {currentPosterUrl && (
        <Button variant="ghost" size="sm" onClick={handleRemove} disabled={uploading}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );
}
