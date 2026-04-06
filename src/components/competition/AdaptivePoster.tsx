import { useState } from "react";
import { cn } from "@/lib/utils";

interface AdaptivePosterProps {
  src: string;
  alt?: string;
  className?: string;
  /** Target container aspect ratio e.g. "16/9" */
  aspectRatio?: string;
}

/**
 * Displays any uploaded image (portrait, landscape, square) beautifully
 * inside a fixed aspect-ratio container. If the image doesn't match the
 * container ratio it shows a blurred+dimmed version behind as fill.
 */
export function AdaptivePoster({
  src,
  alt = "Poster",
  className,
  aspectRatio = "16/9",
}: AdaptivePosterProps) {
  const [needsBlur, setNeedsBlur] = useState(false);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    // Container is 16:9 = 1.78. If image ratio deviates significantly, use blur bg
    const containerRatio = aspectRatio.includes("/")
      ? Number(aspectRatio.split("/")[0]) / Number(aspectRatio.split("/")[1])
      : 16 / 9;
    const deviation = Math.abs(imgRatio - containerRatio) / containerRatio;
    setNeedsBlur(deviation > 0.15);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        className
      )}
      style={{ aspectRatio }}
    >
      {/* Blurred background fill — only visible when image doesn't match ratio */}
      {needsBlur && (
        <img
          src={src}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40"
        />
      )}

      {/* Main image — always centered and fully visible */}
      <img
        src={src}
        alt={alt}
        onLoad={handleLoad}
        className={cn(
          "relative z-10 w-full h-full",
          needsBlur ? "object-contain" : "object-cover"
        )}
      />
    </div>
  );
}
