/**
 * Client-side avatar processing.
 *
 * - Accepts only image/jpeg and image/png (webp & gif rejected).
 * - Hard 2MB cap before processing.
 * - Re-encodes through a canvas to a 256×256 JPEG. The re-encode strips
 *   EXIF metadata (orientation, GPS, etc.) as a side effect because canvas
 *   only ever emits clean pixel data.
 * - Verifies that the file's MIME type matches its magic-number signature
 *   so a renamed `.jpg` containing an SVG/HTML payload is rejected.
 */

export const ACCEPTED_AVATAR_MIME = ["image/jpeg", "image/png"] as const;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const AVATAR_OUTPUT_SIZE = 256;
const AVATAR_OUTPUT_TYPE = "image/jpeg";
const AVATAR_OUTPUT_QUALITY = 0.9;

export interface ProcessedAvatar {
  blob: Blob;
  /** Recommended file extension for storage uploads. */
  extension: "jpg";
  /** Output MIME type (always image/jpeg after processing). */
  contentType: typeof AVATAR_OUTPUT_TYPE;
}

/** Reads the first few bytes of a file to verify its real image format. */
async function detectImageMime(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  // JPEG: FF D8 FF
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47 &&
    head[4] === 0x0d && head[5] === 0x0a && head[6] === 0x1a && head[7] === 0x0a
  ) return "image/png";
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image. Please try another file."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image processing failed."))),
      AVATAR_OUTPUT_TYPE,
      AVATAR_OUTPUT_QUALITY,
    );
  });
}

/**
 * Validate, resize and re-encode an uploaded avatar file.
 * Throws an Error with a user-safe message on rejection.
 */
export async function processAvatarFile(file: File): Promise<ProcessedAvatar> {
  if (!(ACCEPTED_AVATAR_MIME as readonly string[]).includes(file.type)) {
    throw new Error("Only JPG and PNG images are allowed.");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error("Image must be 2 MB or smaller.");
  }

  const detected = await detectImageMime(file);
  if (!detected || detected !== file.type) {
    throw new Error("File contents do not match its type. Please re-export and try again.");
  }

  const img = await loadImage(file);

  // Center-crop to a square, then scale to AVATAR_OUTPUT_SIZE.
  const sourceSize = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - sourceSize) / 2;
  const sy = (img.naturalHeight - sourceSize) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing is unavailable in this browser.");

  // White background so transparent PNGs flatten cleanly into JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
  ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);

  const blob = await canvasToBlob(canvas);
  return { blob, extension: "jpg", contentType: AVATAR_OUTPUT_TYPE };
}
