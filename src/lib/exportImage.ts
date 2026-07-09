import { toPng, toJpeg } from "html-to-image";

export type ImageFormat = "png" | "jpeg";

export async function downloadNodeAsImage(
  node: HTMLElement,
  filename: string,
  format: ImageFormat = "png",
) {
  const options = {
    cacheBust: true,
    pixelRatio: 2,
    // Use the node's actual background so exported image isn't transparent.
    backgroundColor:
      getComputedStyle(document.documentElement).getPropertyValue("--background")
        ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--background")})`
        : "#0b0b0b",
  };
  const dataUrl =
    format === "jpeg" ? await toJpeg(node, { ...options, quality: 0.95 }) : await toPng(node, options);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${filename}.${format === "jpeg" ? "jpg" : "png"}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
