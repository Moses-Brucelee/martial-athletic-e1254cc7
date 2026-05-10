import { pipeline, env } from "@huggingface/transformers";

// Avoid local model lookup; load straight from HF CDN
env.allowLocalModels = false;
env.useBrowserCache = true;

const MAX_DIM = 1024;

let segmenterPromise: Promise<any> | null = null;
function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = pipeline("image-segmentation", "Xenova/segformer-b0-finetuned-ade-512-512", {
      // @ts-ignore - device option
      device: "webgpu",
    }).catch(() =>
      pipeline("image-segmentation", "Xenova/segformer-b0-finetuned-ade-512-512")
    );
  }
  return segmenterPromise;
}

function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function resizeToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  let { width, height } = img;
  if (width > MAX_DIM || height > MAX_DIM) {
    const scale = MAX_DIM / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
  return canvas;
}

/**
 * Remove background from an image file. Returns a transparent PNG Blob.
 * Falls back to the original file if the model fails to load.
 */
export async function removeBackground(file: File | Blob): Promise<Blob> {
  try {
    const segmenter = await getSegmenter();
    const img = await loadImage(file);
    const canvas = resizeToCanvas(img);
    const ctx = canvas.getContext("2d")!;

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const result = await segmenter(dataUrl);
    if (!Array.isArray(result) || result.length === 0) throw new Error("no segmentation");

    // Use first mask as foreground (good enough for logos/portraits)
    const mask = result[0].mask;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < mask.data.length; i++) {
      // Invert: keep where mask alpha is high, transparent elsewhere
      const alpha = Math.round((1 - mask.data[i] / 255) * 255);
      imageData.data[i * 4 + 3] = alpha;
    }
    ctx.putImageData(imageData, 0, 0);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
    );
  } catch (err) {
    console.warn("[removeBackground] falling back to original:", err);
    return file;
  }
}
