// Client-side image resize/recompress. Accepts any common image format and
// outputs a JPEG/PNG within target dimensions and file size.

export interface ResizeOptions {
  maxDim?: number;        // longest edge in pixels (default 1920)
  maxBytes?: number;      // target size cap (default 1.8 MB)
  preferPng?: boolean;    // keep alpha channel
  mimeType?: string;      // override output mime
}

function loadImg(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement, mime: string, q: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), mime, q)
  );
}

/**
 * Resize/recompress an image so its longest edge ≤ maxDim and file ≤ maxBytes.
 * Falls back to the original file if the browser can't decode it.
 */
export async function resizeImage(file: File | Blob, opts: ResizeOptions = {}): Promise<Blob> {
  const maxDim = opts.maxDim ?? 1920;
  const maxBytes = opts.maxBytes ?? 1.8 * 1024 * 1024;
  const preferPng = opts.preferPng ?? false;
  const mime = opts.mimeType ?? (preferPng ? "image/png" : "image/jpeg");

  try {
    const img = await loadImg(file);
    let { width, height } = img;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    if (!preferPng) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);

    if (mime === "image/png") {
      return await canvasToBlob(canvas, "image/png", 1);
    }

    // JPEG: iteratively reduce quality until under maxBytes
    let q = 0.92;
    let blob = await canvasToBlob(canvas, "image/jpeg", q);
    while (blob.size > maxBytes && q > 0.4) {
      q -= 0.1;
      blob = await canvasToBlob(canvas, "image/jpeg", q);
    }
    // Last resort: scale down further
    let curW = width;
    let curH = height;
    while (blob.size > maxBytes && curW > 800) {
      curW = Math.round(curW * 0.85);
      curH = Math.round(curH * 0.85);
      const c2 = document.createElement("canvas");
      c2.width = curW; c2.height = curH;
      c2.getContext("2d")!.drawImage(img, 0, 0, curW, curH);
      blob = await canvasToBlob(c2, "image/jpeg", 0.82);
    }
    return blob;
  } catch (err) {
    console.warn("[resizeImage] falling back to original:", err);
    return file;
  }
}
