import 'server-only';

import { z } from 'zod';

/** One turn of a conversation about a post, as the reader's browser keeps it. */
export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export const askSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(20)
    .refine((list) => list.at(-1)?.role === 'user' && list.at(-1)!.content.length <= 1000),
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Answers the last question in `messages` about a post, piece by piece.
 *
 * For now a canned reply streamed word by word, so the panel can be tried end
 * to end. A model call replaces the body of this function; the route and the
 * panel already speak plain-text streams and need no change.
 */
export async function* answerAboutPost(
  post: { title: string },
  messages: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<string> {
  const reply = [
    'ეს სატესტო პასუხია: ასისტენტი ჯერ არ არის ჩართული.',
    `როცა ჩაირთვება, აქ გამოჩნდება პასუხი შენს კითხვაზე — სტატიის „${post.title}“ ტექსტზე დაყრდნობით.`,
  ].join('\n\n');

  await sleep(700);
  // Split after whitespace, so every piece keeps the spaces and line breaks it came with.
  for (const piece of reply.split(/(?<=\s)/)) {
    if (signal.aborted) return;
    yield piece;
    await sleep(25 + Math.random() * 45);
  }
}
