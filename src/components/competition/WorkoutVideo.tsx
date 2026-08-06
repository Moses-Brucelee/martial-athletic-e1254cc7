import { useState } from "react";
import { PlayCircle, ExternalLink } from "lucide-react";

interface WorkoutVideoProps {
  url: string | null | undefined;
  /** Compact renders a thin link row instead of the full player. */
  compact?: boolean;
}

/** Convert a YouTube/Vimeo watch URL into its embeddable form. Returns null when not embeddable. */
export function toEmbedUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.endsWith("youtube.com")) {
      if (url.pathname.startsWith("/embed/")) return url.toString();
      if (url.pathname.startsWith("/shorts/")) {
        return `https://www.youtube.com/embed/${url.pathname.split("/")[2]}`;
      }
      const v = url.searchParams.get("v");
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (host.endsWith("vimeo.com")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function WorkoutVideo({ url, compact }: WorkoutVideoProps) {
  const [playing, setPlaying] = useState(false);
  if (!url?.trim()) return null;

  const embed = toEmbedUrl(url);

  if (compact || !embed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mt-2"
      >
        <PlayCircle className="h-3.5 w-3.5" />
        Watch video
        <ExternalLink className="h-3 w-3 opacity-60" />
      </a>
    );
  }

  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-border bg-muted/30">
      {playing ? (
        <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            src={`${embed}?autoplay=1`}
            title="Workout video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
        >
          <PlayCircle className="h-5 w-5 text-primary shrink-0" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
            Play workout video
          </span>
        </button>
      )}
    </div>
  );
}
