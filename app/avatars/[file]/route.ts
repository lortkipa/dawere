import { openAvatar } from "@/lib/avatars";

// Every upload gets a fresh name, so a file at a given URL never changes.
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const avatar = await openAvatar((await params).file);
  if (!avatar) return new Response("Not found", { status: 404 });

  return new Response(avatar.stream, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(avatar.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
