import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq, sql } from 'drizzle-orm';
import { ArrowLeft, Eye, Heart, MessageCircle } from 'lucide-react';
import { db } from '@/db';
import { postTopics, posts, topics, users } from '@/db/schema';
import { requireAdmin } from '@/lib/auth';
import { AccessBadge, AdminMain, When } from '@/components/admin/bits';
import { AdminPostEditor } from '@/components/admin/post-admin-editor';
import { Avatar, Badge } from '@/components/ui';
import { formatCount, isUuid } from '@/lib/utils';

export const metadata: Metadata = { title: 'სტატია' };

export default async function AdminPostPage(props: PageProps<'/admin/posts/[id]'>) {
  const { id } = await props.params;
  await requireAdmin(`/admin/posts/${id}`);
  if (!isUuid(id)) notFound();

  const [row] = await db
    .select({ post: posts, author: users })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(eq(posts.id, id))
    .limit(1);
  if (!row) notFound();
  const { post, author } = row;

  const [assigned, suggestions, [reports]] = await Promise.all([
    db
      .select({ name: topics.name })
      .from(postTopics)
      .innerJoin(topics, eq(topics.id, postTopics.topicId))
      .where(eq(postTopics.postId, post.id))
      .orderBy(topics.name),
    db
      .select({ name: topics.name })
      .from(topics)
      .orderBy(desc(topics.isFeatured), desc(topics.postCount), topics.name)
      .limit(40),
    db.execute<{ edits: number }>(sql`
      select count(*)::int as edits from admin_log where target_type = 'post' and target_id = ${post.id}
    `),
  ]);

  const published = post.status === 'published';

  return (
    <AdminMain>
      <Link
        href="/admin/posts"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        სტატიები
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={author.name} src={author.avatarUrl} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/admin/users/${author.id}`} className="font-medium text-ink hover:underline">
                {author.name}
              </Link>
              <AccessBadge access={author.access} />
              {author.suspendedAt ? <Badge tone="danger">შეჩერებული</Badge> : null}
            </div>
            <p className="text-[13px] text-subtle">
              {published ? (
                <>
                  გამოქვეყნდა <When date={post.publishedAt} />
                </>
              ) : (
                <>
                  მონახაზი · შეიცვალა <When date={post.updatedAt} />
                </>
              )}
              {reports.edits > 0 ? ` · ადმინის ${reports.edits} ცვლილება` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[13px] text-muted">
          {published ? <Badge tone="accent">გამოქვეყნებული</Badge> : <Badge>მონახაზი</Badge>}
          <span className="inline-flex items-center gap-1" title="ნახვები">
            <Eye className="size-3.5 text-subtle" /> {formatCount(post.viewCount)}
          </span>
          <span className="inline-flex items-center gap-1" title="მოწონებები">
            <Heart className="size-3.5 text-subtle" /> {formatCount(post.likeCount)}
          </span>
          <Link
            href={`/admin/comments?post=${post.id}`}
            className="inline-flex items-center gap-1 hover:text-ink"
            title="კომენტარები"
          >
            <MessageCircle className="size-3.5 text-subtle" /> {formatCount(post.commentCount)}
          </Link>
        </div>
      </header>

      <AdminPostEditor
        postId={post.id}
        slug={post.slug}
        published={published}
        hasPending={Boolean(post.pendingRevision)}
        topicSuggestions={suggestions.map((t) => t.name)}
        initial={{
          title: post.title,
          subtitle: post.subtitle,
          contentHtml: post.contentHtml,
          coverImageUrl: post.coverImageUrl,
          topics: assigned.map((t) => t.name),
        }}
      />
    </AdminMain>
  );
}
