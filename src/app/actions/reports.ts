'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db, isUniqueViolation } from '@/db';
import { comments, posts, reports, users, type ReportTarget } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { TOO_MANY, rateLimit } from '@/lib/rate-limit';
import { REASONS_FOR } from '@/lib/reports';
import { excerpt } from '@/lib/utils';
import { reportSchema } from '@/lib/validation';

export type ReportResult = { ok: boolean; error?: string; duplicate?: boolean };

type Snapshot = { ownerId: string; label: string; excerpt: string };

/** What the admin will see: copied now, since the target may change or vanish. */
async function snapshot(type: ReportTarget, id: string): Promise<Snapshot | null> {
  if (type === 'post') {
    const [post] = await db
      .select({ ownerId: posts.authorId, title: posts.title, subtitle: posts.subtitle, text: posts.contentText })
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.status, 'published')))
      .limit(1);
    if (!post) return null;
    return { ownerId: post.ownerId, label: post.title || 'უსათაურო', excerpt: excerpt(post.subtitle || post.text, 300) };
  }

  if (type === 'comment') {
    const [comment] = await db
      .select({ ownerId: comments.authorId, body: comments.body, postTitle: posts.title })
      .from(comments)
      .innerJoin(posts, eq(posts.id, comments.postId))
      .where(and(eq(comments.id, id), isNull(comments.deletedAt), eq(posts.status, 'published')))
      .limit(1);
    if (!comment) return null;
    return { ownerId: comment.ownerId, label: comment.postTitle || 'უსათაურო', excerpt: comment.body.slice(0, 1000) };
  }

  const [user] = await db
    .select({ id: users.id, name: users.name, username: users.username, bio: users.bio })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!user) return null;
  return { ownerId: user.id, label: `${user.name} (@${user.username})`, excerpt: user.bio.slice(0, 300) };
}

export async function reportAction(input: {
  targetType: string;
  targetId: string;
  reason: string;
  details?: string;
}): Promise<ReportResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'შეტყობინებისთვის საჭიროა შესვლა.' };

  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'შეტყობინება არასწორია.' };
  const { targetType, targetId, reason, details } = parsed.data;

  if (!REASONS_FOR[targetType].includes(reason)) return { ok: false, error: 'აირჩიე მიზეზი.' };
  if (reason === 'other' && !details) return { ok: false, error: 'მოკლედ აღწერე, რა ხდება.' };

  const target = await snapshot(targetType, targetId);
  if (!target) return { ok: false, error: 'ეს უკვე აღარ არსებობს.' };
  if (target.ownerId === user.id) return { ok: false, error: 'საკუთარ თავზე შეტყობინებას ვერ გააგზავნი.' };

  if (!(await rateLimit(`report:${user.id}`, 10, 3600))) return { ok: false, error: TOO_MANY };

  try {
    await db.insert(reports).values({
      reporterId: user.id,
      targetType,
      targetId,
      targetOwnerId: target.ownerId,
      targetLabel: target.label.slice(0, 200),
      targetExcerpt: target.excerpt,
      reason,
      details,
    });
  } catch (error) {
    // One open report per reader per target; the admins already have this one.
    if (isUniqueViolation(error)) return { ok: true, duplicate: true };
    throw error;
  }

  revalidatePath('/admin', 'layout');
  return { ok: true };
}
