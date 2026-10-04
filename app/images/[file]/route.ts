import { openImage } from "@/lib/uploads";

// Every upload gets a fresh name, so a file at a given URL never changes.
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const image = await openImage((await params).file);
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(image.stream, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(image.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
