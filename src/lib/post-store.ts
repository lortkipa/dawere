import 'server-only';

import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { postTopics, posts, topics, type PostRevision } from '@/db/schema';
import { htmlToText } from './sanitize';
import { readingMinutes, slugify } from './utils';

/**
 * Matches on the name before the slug: seeded topics carry English slugs
 * ("databases") that the transliterated slug of their Georgian name never reaches.
 */
async function findTopic(name: string, slug: string) {
  const sameName = sql`lower(${topics.name}) = lower(${name})`;
  const [row] = await db
    .select({ id: topics.id })
    .from(topics)
    .where(or(sameName, eq(topics.slug, slug)))
    .orderBy(desc(sameName))
    .limit(1);
  return row?.id;
}

/** Finds or creates each topic, then replaces the post's tags with exactly that set. */
export async function syncTopics(postId: string, names: string[]) {
  const cleaned = [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(0, 5);

  if (cleaned.length === 0) {
    await db.delete(postTopics).where(eq(postTopics.postId, postId));
    return;
  }

  const ids: string[] = [];
  for (const name of cleaned) {
    const slug = slugify(name, 40);
    const existing = await findTopic(name, slug);
    if (existing) {
      ids.push(existing);
      continue;
    }
    const [created] = await db
      .insert(topics)
      .values({ slug, name })
      .onConflictDoNothing()
      .returning({ id: topics.id });
    // A concurrent save can create the topic between the lookup and the insert.
    const id = created?.id ?? (await findTopic(name, slug));
    if (id) ids.push(id);
  }

  // Only the difference is written, which keeps the post_count triggers honest.
  const current = await db
    .select({ topicId: postTopics.topicId })
    .from(postTopics)
    .where(eq(postTopics.postId, postId));

  const currentIds = new Set(current.map((t) => t.topicId));
  const nextIds = new Set(ids);

  const toRemove = [...currentIds].filter((id) => !nextIds.has(id));
  const toAdd = [...nextIds].filter((id) => !currentIds.has(id));

  if (toRemove.length > 0) {
    await db
      .delete(postTopics)
      .where(and(eq(postTopics.postId, postId), inArray(postTopics.topicId, toRemove)));
  }
  if (toAdd.length > 0) {
    await db
      .insert(postTopics)
      .values(toAdd.map((topicId) => ({ postId, topicId })))
      .onConflictDoNothing();
  }
}

/** Writes a revision into the live columns and tags. */
export async function applyRevision(postId: string, revision: PostRevision) {
  const contentText = htmlToText(revision.contentHtml);
  await db
    .update(posts)
    .set({
      title: revision.title,
      subtitle: revision.subtitle,
      contentHtml: revision.contentHtml,
      contentText,
      coverImageUrl: revision.coverImageUrl || null,
      readingMinutes: readingMinutes(contentText),
      pendingRevision: null,
    })
    .where(eq(posts.id, postId));
  await syncTopics(postId, revision.topics);
}
