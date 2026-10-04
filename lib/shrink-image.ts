// Shrinks a photo in the browser before it's sent, so a post with a dozen phone photos still
// fits in one request. The server re-encodes it again either way.
const maxEdge = 2000;

function toBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
}

// Throws when the file isn't an image the browser can decode.
export async function shrinkImage(file: Blob) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d")!;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const webp = await toBlob(canvas, "image/webp");
  if (webp?.type === "image/webp") return webp;

  // Browsers that can't encode WebP (Safari) hand back a PNG instead, which is much bigger.
  // JPEG has no transparency, so transparent parts go white like the page.
  context.globalCompositeOperation = "destination-over";
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const jpeg = await toBlob(canvas, "image/jpeg");
  if (!jpeg) throw new Error("Could not encode the image");
  return jpeg;
}
