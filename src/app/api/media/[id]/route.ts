import { loadImage } from '@/lib/storage';
import { isUuid } from '@/lib/utils';

export async function GET(_request: Request, ctx: RouteContext<'/api/media/[id]'>) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return new Response('Not found', { status: 404 });

  const image = await loadImage(id);
  if (!image) return new Response('Not found', { status: 404 });

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      'Content-Type': image.mimeType,
      // Content at a given id never changes, so it can be cached hard.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(image.bytes.byteLength),
      // User uploads: never let a browser sniff one into something executable.
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
