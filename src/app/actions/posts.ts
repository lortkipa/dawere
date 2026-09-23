'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { posts, type PostRevision } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { applyRevision } from '@/lib/post-store';
import { isBlankHtml, sanitizePostHtml } from '@/lib/sanitize';
import { postSchema } from '@/lib/validation';
import { isUuid, randomSuffix, slugify } from '@/lib/utils';

export type SaveResult = { ok: boolean; error?: string; savedAt?: number };

const GONE: SaveResult = { ok: false, error: 'ეს სტატია აღარ არსებობს.' };

/** Confirms the post exists and belongs to the signed-in user. */
async function ownedPost(postId: string) {
  const user = await requireUser();
  if (!isUuid(postId)) return { user, post: undefined };
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.authorId, user.id)))
    .limit(1);
  return { user, post };
}

/**
 * /write lands here. An untouched draft from an earlier visit is reused, so
 * opening the editor and walking away does not leave a trail of empty drafts.
 */
export async function createDraftAction() {
  const user = await requireUser('/write');

  const [blank] = await db.execute<{ id: string }>(sql`
    select p.id from posts p
    where p.author_id = ${user.id}::uuid
      and p.status = 'draft'
      and p.published_at is null
      and p.title = '' and p.subtitle = ''
      and p.content_html in ('', '<p></p>')
      and p.cover_image_url is null
      and not exists (select 1 from post_topics pt where pt.post_id = p.id)
    order by p.created_at desc
    limit 1
  `);
  if (blank) redirect(`/write/${blank.id}`);

  const [draft] = await db
    .insert(posts)
    .values({ authorId: user.id, slug: `draft-${randomSuffix(12)}`, status: 'draft' })
    .returning({ id: posts.id });

  redirect(`/write/${draft.id}`);
}

export async function savePostAction(postId: string, input: PostRevision): Promise<SaveResult> {
  const { post } = await ownedPost(postId);
  if (!post) return GONE;

  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'შენახვა ვერ მოხერხდა.' };
  }

  const revision: PostRevision = {
    title: parsed.data.title,
    subtitle: parsed.data.subtitle,
    contentHtml: sanitizePostHtml(parsed.data.contentHtml),
    coverImageUrl: parsed.data.coverImageUrl || null,
    topics: parsed.data.topics,
  };

  if (post.status === 'published') {
    // Readers keep seeing the published text until the author presses "update".
    await db.update(posts).set({ pendingRevision: revision }).where(eq(posts.id, postId));
  } else {
    await applyRevision(postId, revision);
  }

  return { ok: true, savedAt: Date.now() };
}

export async function publishPostAction(postId: string): Promise<SaveResult> {
  const { post } = await ownedPost(postId);
  if (!post) return GONE;

  const effective = post.pendingRevision ?? post;
  if (!effective.title.trim()) return { ok: false, error: 'გამოქვეყნებამდე მიეცი სტატიას სათაური.' };
  if (isBlankHtml(effective.contentHtml)) return { ok: false, error: 'გამოქვეყნებამდე დაწერე რამე.' };

  if (post.pendingRevision) await applyRevision(postId, post.pendingRevision);

  // The slug is minted once, on first publish, and never changes afterwards so
  // that links keep working when the title is edited.
  const slug = post.publishedAt ? post.slug : `${slugify(effective.title)}-${randomSuffix(6)}`;

  await db
    .update(posts)
    .set({ status: 'published', slug, publishedAt: post.publishedAt ?? new Date() })
    .where(eq(posts.id, postId));

  revalidatePath('/');
  revalidatePath(`/p/${slug}`);
  redirect(`/p/${slug}${post.publishedAt ? '' : '?published=1'}`);
}

/** Throws away edits to a published post that were never pushed live. */
export async function discardChangesAction(postId: string): Promise<SaveResult> {
  const { post } = await ownedPost(postId);
  if (!post) return GONE;
  await db.update(posts).set({ pendingRevision: null }).where(eq(posts.id, postId));
  return { ok: true };
}

export async function unpublishPostAction(postId: string): Promise<SaveResult> {
  const { post } = await ownedPost(postId);
  if (!post) return GONE;

  // As a draft, what the editor shows is what is stored — fold pending edits in.
  if (post.pendingRevision) await applyRevision(postId, post.pendingRevision);
  await db.update(posts).set({ status: 'draft' }).where(eq(posts.id, postId));

  revalidatePath('/');
  revalidatePath('/dashboard');
  revalidatePath(`/p/${post.slug}`);
  return { ok: true };
}

export async function deletePostAction(postId: string): Promise<SaveResult> {
  const { post } = await ownedPost(postId);
  if (!post) return GONE;

  // Comments, likes, views and tags all cascade from the posts row.
  await db.delete(posts).where(eq(posts.id, postId));
  revalidatePath('/');
  revalidatePath('/dashboard');
  redirect('/dashboard?deleted=1');
}
