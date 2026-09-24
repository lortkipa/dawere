import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { posts } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { answerAboutPost, askSchema } from '@/lib/assistant';
import { TOO_MANY, rateLimit } from '@/lib/rate-limit';
import { isUuid } from '@/lib/utils';

const UNAVAILABLE = 'ეს სტატია მიუწვდომელია.';

/**
 * A reader's question about a published post, answered as a plain-text stream.
 * Signed-in readers only: once a model is behind this, every answer costs money.
 */
export async function POST(request: Request, ctx: RouteContext<'/api/posts/[id]/ask'>) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'კითხვის დასასმელად საჭიროა შესვლა.' }, { status: 401 });

  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: UNAVAILABLE }, { status: 404 });

  if (!(await rateLimit(`ask:${user.id}`, 20, 600))) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  }

  const parsed = askSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'კითხვა ვერ მივიღეთ.' }, { status: 400 });

  const [post] = await db
    .select({ title: posts.title })
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.status, 'published')))
    .limit(1);
  if (!post) return NextResponse.json({ error: UNAVAILABLE }, { status: 404 });

  const encoder = new TextEncoder();
  const answer = answerAboutPost(post, parsed.data.messages, request.signal);
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await answer.next();
      if (done) controller.close();
      else controller.enqueue(encoder.encode(value));
    },
    // The reader pressed stop or left the page.
    async cancel() {
      await answer.return(undefined);
    },
  });

  return new Response(stream, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}
