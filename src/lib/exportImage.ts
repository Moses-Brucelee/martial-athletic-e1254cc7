import { toPng, toJpeg } from "html-to-image";

export type ImageFormat = "png" | "jpeg";

/** Resolve the node's own painted background (walks up past transparent parents). */
function resolveBackground(node: HTMLElement): string {
  let el: HTMLElement | null = node;
  while (el) {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== "transparent" && !/rgba\(.*,\s*0\)$/.test(bg)) return bg;
    el = el.parentElement;
  }
  return "#ffffff";
}

export async function downloadNodeAsImage(
  node: HTMLElement,
  filename: string,
  format: ImageFormat = "png",
) {
  // Use the board's own background (set by its display mode), never the global theme.
  const options = { cacheBust: true, pixelRatio: 2, backgroundColor: resolveBackground(node) };
  const dataUrl =
    format === "jpeg" ? await toJpeg(node, { ...options, quality: 0.95 }) : await toPng(node, options);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${filename}.${format === "jpeg" ? "jpg" : "png"}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
