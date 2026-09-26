import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { postTopics, posts, topics } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { isUuid } from '@/lib/utils';
import { PostEditor } from '@/components/editor/post-editor';

export const metadata: Metadata = { title: 'რედაქტორი', robots: { index: false } };

export default async function EditPostPage(props: PageProps<'/write/[id]'>) {
  const { id } = await props.params;
  const user = await requireUser(`/write/${id}`);
  if (!isUuid(id)) notFound();

  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.authorId, user.id)))
    .limit(1);

  if (!post) notFound();

  const [assigned, suggestions] = await Promise.all([
    db
      .select({ name: topics.name })
      .from(postTopics)
      .innerJoin(topics, eq(topics.id, postTopics.topicId))
      .where(eq(postTopics.postId, post.id))
      .orderBy(topics.name),
    // Editorial topics first, so a writer's first instinct lands on a topic
    // readers follow rather than on a one-off tag.
    db
      .select({ name: topics.name })
      .from(topics)
      .orderBy(desc(topics.isFeatured), desc(topics.postCount), topics.name)
      .limit(40),
  ]);

  // A published post with unpushed edits opens on those edits, not on the live text.
  const revision = post.pendingRevision;

  return (
    <PostEditor
      // Publishing state changes what the editor saves to; start it afresh.
      key={post.status}
      postId={post.id}
      slug={post.slug}
      status={post.status}
      initiallyPending={Boolean(revision)}
      initial={
        revision ?? {
          title: post.title,
          subtitle: post.subtitle,
          contentHtml: post.contentHtml,
          coverImageUrl: post.coverImageUrl,
          topics: assigned.map((t) => t.name),
        }
      }
      topicSuggestions={suggestions.map((t) => t.name)}
    />
  );
}
