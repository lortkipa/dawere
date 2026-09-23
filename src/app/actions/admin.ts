'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { db, isUniqueViolation } from '@/db';
import { comments, posts, topics, users, type Access, type PostRevision, type User } from '@/db/schema';
import {
  hashPassword,
  requireAdmin,
  requireSuperAdmin,
  revokeAllSessions,
  verifyPassword,
} from '@/lib/auth';
import { canManage, generatePassword, logAdmin } from '@/lib/admin';
import { applyRevision } from '@/lib/post-store';
import { TOO_MANY, rateLimit } from '@/lib/rate-limit';
import { isBlankHtml, sanitizePostHtml } from '@/lib/sanitize';
import { deleteImagesOwnedBy } from '@/lib/storage';
import { isUuid, randomSuffix, slugify } from '@/lib/utils';
import {
  adminCreateUserSchema,
  adminUserSchema,
  echoValues,
  postSchema,
  topicSchema,
  zodToFormState,
  type FormState,
} from '@/lib/validation';

export type AdminResult = { ok: boolean; error?: string; count?: number; password?: string };

const NOT_FOUND: AdminResult = { ok: false, error: 'ჩანაწერი ვერ მოიძებნა. შესაძლოა, უკვე წაიშალა.' };
const NOT_ALLOWED: AdminResult = { ok: false, error: 'ამის უფლება არ გაქვს.' };

/** Bulk actions take at most a page of ids, and only well-formed ones. */
function cleanIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter(isUuid))].slice(0, 100);
}

/** Everything public can show what an admin changed; refresh it all at once. */
function refreshSite() {
  revalidatePath('/', 'layout');
}

async function loadUser(id: string) {
  if (!isUuid(id)) return undefined;
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

/** Password re-entry for the actions that cannot be undone. */
async function confirmPassword(actor: User, password: unknown): Promise<AdminResult | null> {
  if (!(await rateLimit(`admin-confirm:${actor.id}`, 10, 900))) return { ok: false, error: TOO_MANY };
  if (typeof password !== 'string' || !password) return { ok: false, error: 'დასადასტურებლად შეიყვანე შენი პაროლი.' };
  if (!(await verifyPassword(password, actor.passwordHash))) return { ok: false, error: 'პაროლი არასწორია.' };
  return null;
}

/* ===================================================================== users */

export type CreateUserState = FormState & { password?: string; userId?: string; username?: string };

async function uniqueUsername(name: string): Promise<string> {
  const base = slugify(name, 20).replace(/-/g, '_') || 'writer';
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? base : `${base}_${randomSuffix(4)}`;
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, candidate)).limit(1);
    if (!taken) return candidate;
  }
  return `writer_${randomSuffix(8)}`;
}

export async function createUserAction(_prev: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const actor = await requireAdmin();
  const values = echoValues(formData, 'name', 'email', 'username', 'access');

  const parsed = adminCreateUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    username: formData.get('username') ?? '',
    password: formData.get('password') ?? '',
    access: formData.get('access') || 'user',
  });
  if (!parsed.success) return zodToFormState(parsed.error, values);
  const input = parsed.data;

  // Only the super admin appoints admins; anyone else's request is quietly a member.
  const access: Access = actor.access === 'super_admin' ? input.access : 'user';

  const [emailTaken] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (emailTaken) return { ok: false, fieldErrors: { email: 'ამ ელფოსტაზე ანგარიში უკვე არსებობს.' }, values };

  if (input.username) {
    const [handleTaken] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, input.username))
      .limit(1);
    if (handleTaken) return { ok: false, fieldErrors: { username: 'ეს მომხმარებლის სახელი დაკავებულია.' }, values };
  }

  const generated = input.password ? undefined : generatePassword();
  let created: { id: string; username: string; access: Access };
  try {
    [created] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        username: input.username || (await uniqueUsername(input.name)),
        passwordHash: await hashPassword(input.password || generated!),
        access,
      })
      .returning({ id: users.id, username: users.username, access: users.access });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: 'ელფოსტა ან მომხმარებლის სახელი ახლახან დაიკავეს. სცადე თავიდან.', values };
    }
    throw error;
  }

  await logAdmin(actor, 'user.create', { type: 'user', id: created.id, label: `@${created.username}` }, {
    access: created.access,
  });
  refreshSite();
  return { ok: true, password: generated, userId: created.id, username: created.username };
}

export async function updateUserAction(userId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireAdmin();
  const values = echoValues(formData, 'name', 'username', 'email', 'bio', 'location', 'website');

  const target = await loadUser(userId);
  if (!target) return { ok: false, error: NOT_FOUND.error, values };
  if (!canManage(actor, target)) return { ok: false, error: NOT_ALLOWED.error, values };

  const parsed = adminUserSchema.safeParse({
    name: formData.get('name'),
    username: formData.get('username'),
    email: formData.get('email'),
    bio: formData.get('bio') ?? '',
    location: formData.get('location') ?? '',
    website: formData.get('website') ?? '',
  });
  if (!parsed.success) return zodToFormState(parsed.error, values);
  const next = parsed.data;

  const [clash] = await db
    .select({ email: users.email, username: users.username })
    .from(users)
    .where(
      and(
        ne(users.id, target.id),
        sql`(${users.email} = ${next.email} or ${users.username} = ${next.username})`,
      ),
    )
    .limit(1);
  if (clash) {
    return {
      ok: false,
      fieldErrors:
        clash.email === next.email
          ? { email: 'ეს ელფოსტა სხვა ანგარიშს ეკუთვნის.' }
          : { username: 'ეს მომხმარებლის სახელი დაკავებულია.' },
      values,
    };
  }

  const changed = (Object.keys(next) as (keyof typeof next)[]).filter((key) => next[key] !== target[key]);
  if (changed.length === 0) return { ok: true, values: next };

  try {
    await db.update(users).set(next).where(eq(users.id, target.id));
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: 'ელფოსტა ან მომხმარებლის სახელი ახლახან დაიკავეს.', values };
    throw error;
  }

  await logAdmin(actor, 'user.update', { type: 'user', id: target.id, label: `@${next.username}` }, { fields: changed });
  refreshSite();
  return { ok: true, values: next };
}

export async function removeUserAvatarAction(userId: string): Promise<AdminResult> {
  const actor = await requireAdmin();
  const target = await loadUser(userId);
  if (!target) return NOT_FOUND;
  if (!canManage(actor, target)) return NOT_ALLOWED;

  await db.update(users).set({ avatarUrl: null }).where(eq(users.id, target.id));
  await logAdmin(actor, 'user.remove_avatar', { type: 'user', id: target.id, label: `@${target.username}` });
  refreshSite();
  return { ok: true };
}

/** The targets among `ids` this admin may act on; the rest are skipped, not errors. */
async function manageableUsers(actor: User, ids: unknown) {
  const clean = cleanIds(ids);
  if (clean.length === 0) return [];
  const rows = await db.select().from(users).where(inArray(users.id, clean));
  return rows.filter((row) => canManage(actor, row));
}

function skippedNote(asked: number, done: number): string | undefined {
  const skipped = asked - done;
  return skipped > 0 ? `${skipped} ანგარიში გამოტოვებულია: მასზე უფლება არ გაქვს.` : undefined;
}

export async function suspendUsersAction(
  ids: string[],
  options: { reason?: string; unpublish?: boolean } = {},
): Promise<AdminResult> {
  const actor = await requireAdmin();
  const targets = (await manageableUsers(actor, ids)).filter((u) => !u.suspendedAt);
  const reason = String(options.reason ?? '').trim().slice(0, 200);

  for (const target of targets) {
    await db.update(users).set({ suspendedAt: new Date(), suspendedReason: reason }).where(eq(users.id, target.id));
    await revokeAllSessions(target.id);

    let unpublished = 0;
    if (options.unpublish) {
      const live = await db
        .select({ id: posts.id, pendingRevision: posts.pendingRevision })
        .from(posts)
        .where(and(eq(posts.authorId, target.id), eq(posts.status, 'published')));
      for (const post of live) await unpublish(post);
      unpublished = live.length;
    }

    await logAdmin(actor, 'user.suspend', { type: 'user', id: target.id, label: `@${target.username}` }, {
      ...(reason ? { reason } : {}),
      ...(options.unpublish ? { unpublished } : {}),
    });
  }

  refreshSite();
  return { ok: true, count: targets.length, error: skippedNote(cleanIds(ids).length, targets.length) };
}

export async function unsuspendUsersAction(ids: string[]): Promise<AdminResult> {
  const actor = await requireAdmin();
  const targets = (await manageableUsers(actor, ids)).filter((u) => u.suspendedAt);

  for (const target of targets) {
    await db.update(users).set({ suspendedAt: null, suspendedReason: '' }).where(eq(users.id, target.id));
    await logAdmin(actor, 'user.unsuspend', { type: 'user', id: target.id, label: `@${target.username}` });
  }

  refreshSite();
  return { ok: true, count: targets.length };
}

export async function deleteUsersAction(ids: string[], password: string): Promise<AdminResult> {
  const actor = await requireAdmin();
  const refused = await confirmPassword(actor, password);
  if (refused) return refused;

  const targets = await manageableUsers(actor, ids);
  for (const target of targets) {
    await deleteImagesOwnedBy(target.id);
    // Posts, comments, likes, follows and sessions cascade from the users row.
    await db.delete(users).where(eq(users.id, target.id));
    // The @handle only: a deleted account's email must not outlive it in the log.
    await logAdmin(actor, 'user.delete', { type: 'user', id: target.id, label: `@${target.username}` });
  }

  refreshSite();
  return { ok: true, count: targets.length, error: skippedNote(cleanIds(ids).length, targets.length) };
}

/**
 * Dawere sends no email, so a reset produces a password for the admin to pass
 * on privately. Every session ends: whoever held the old password is out.
 */
export async function resetUserPasswordAction(userId: string): Promise<AdminResult> {
  const actor = await requireAdmin();
  const target = await loadUser(userId);
  if (!target) return NOT_FOUND;
  if (!canManage(actor, target)) return NOT_ALLOWED;

  const password = generatePassword();
  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, target.id));
  const ended = await revokeAllSessions(target.id);

  await logAdmin(actor, 'user.reset_password', { type: 'user', id: target.id, label: `@${target.username}` }, {
    sessionsEnded: ended,
  });
  return { ok: true, password, count: ended };
}

export async function signOutUserAction(userId: string): Promise<AdminResult> {
  const actor = await requireAdmin();
  const target = await loadUser(userId);
  if (!target) return NOT_FOUND;
  if (!canManage(actor, target)) return NOT_ALLOWED;

  const ended = await revokeAllSessions(target.id);
  await logAdmin(actor, 'user.sign_out', { type: 'user', id: target.id, label: `@${target.username}` }, {
    sessionsEnded: ended,
  });
  revalidatePath(`/admin/users/${target.id}`);
  return { ok: true, count: ended };
}

/* ====================================================================== team */

/** Super admin only: make a member an admin, or an admin a member again. */
export async function setAccessAction(userId: string, access: 'user' | 'admin'): Promise<AdminResult> {
  const actor = await requireSuperAdmin();
  if (access !== 'user' && access !== 'admin') return NOT_ALLOWED;

  const target = await loadUser(userId);
  if (!target) return NOT_FOUND;
  if (!canManage(actor, target)) return NOT_ALLOWED;
  if (target.access === access) return { ok: true };
  if (access === 'admin' && target.suspendedAt) {
    return { ok: false, error: 'შეჩერებულ ანგარიშს ადმინად ვერ დანიშნავ. ჯერ აღადგინე.' };
  }

  await db.update(users).set({ access }).where(eq(users.id, target.id));
  await logAdmin(actor, access === 'admin' ? 'user.promote' : 'user.demote', {
    type: 'user',
    id: target.id,
    label: `@${target.username}`,
  });
  refreshSite();
  return { ok: true };
}

/** Appoints an admin by email or @handle, for the team page. */
export async function addAdminAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const raw = String(formData.get('who') ?? '').trim();
  const values = { who: raw };
  if (!raw) return { ok: false, fieldErrors: { who: 'შეიყვანე ელფოსტა ან მომხმარებლის სახელი.' }, values };

  const handle = raw.replace(/^@/, '').toLowerCase();
  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`${users.email} = ${raw.toLowerCase()} or ${users.username} = ${handle}`)
    .limit(1);
  if (!target) return { ok: false, fieldErrors: { who: 'ასეთი ანგარიში ვერ მოიძებნა.' }, values };

  const result = await setAccessAction(target.id, 'admin');
  if (!result.ok) return { ok: false, fieldErrors: { who: result.error ?? 'ვერ მოხერხდა.' }, values };
  return { ok: true, values: { who: '' } };
}

/**
 * Hands the single super admin seat to someone else. The outgoing super admin
 * stays an admin. Both rows change in one transaction, demotion first, so the
 * one-super-admin index never sees two at once and the seat is never empty.
 */
export async function transferSuperAdminAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireSuperAdmin();
  const refused = await confirmPassword(actor, formData.get('password'));
  if (refused) return { ok: false, fieldErrors: { password: refused.error! } };

  const target = await loadUser(String(formData.get('userId') ?? ''));
  if (!target || target.id === actor.id) return { ok: false, fieldErrors: { userId: 'აირჩიე ადმინი.' } };
  if (target.access !== 'admin') return { ok: false, fieldErrors: { userId: 'ჯერ დანიშნე ის ადმინად.' } };
  if (target.suspendedAt) return { ok: false, fieldErrors: { userId: 'ეს ანგარიში შეჩერებულია.' } };

  await db.transaction(async (tx) => {
    await tx.update(users).set({ access: 'admin' }).where(eq(users.id, actor.id));
    await tx.update(users).set({ access: 'super_admin' }).where(eq(users.id, target.id));
  });

  await logAdmin(actor, 'user.transfer_super_admin', { type: 'user', id: target.id, label: `@${target.username}` });
  refreshSite();
  redirect('/admin/team?transferred=1');
}

/* ===================================================================== posts */

/** Takes a post off the site. Pending edits are folded in, as the author's own unpublish does. */
async function unpublish(post: { id: string; pendingRevision: PostRevision | null }) {
  if (post.pendingRevision) await applyRevision(post.id, post.pendingRevision);
  await db.update(posts).set({ status: 'draft' }).where(eq(posts.id, post.id));
}

async function loadPost(id: string) {
  if (!isUuid(id)) return undefined;
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return row;
}

const postLabel = (post: { title: string }) => post.title || 'უსათაურო';

/**
 * An admin's edit goes straight to the live text: moderation should not wait
 * for anyone to press "update". The author's own unpublished edits, if any,
 * are left alone — the edit page shows them and can discard them.
 */
export async function updatePostAdminAction(postId: string, input: PostRevision): Promise<AdminResult> {
  const actor = await requireAdmin();
  const post = await loadPost(postId);
  if (!post) return NOT_FOUND;

  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'შენახვა ვერ მოხერხდა.' };

  const pending = post.pendingRevision;
  await applyRevision(post.id, {
    title: parsed.data.title,
    subtitle: parsed.data.subtitle,
    contentHtml: sanitizePostHtml(parsed.data.contentHtml),
    coverImageUrl: parsed.data.coverImageUrl || null,
    topics: parsed.data.topics,
  });
  // applyRevision clears pending_revision; the author's draft is theirs to keep.
  if (pending) await db.update(posts).set({ pendingRevision: pending }).where(eq(posts.id, post.id));

  await logAdmin(actor, 'post.update', { type: 'post', id: post.id, label: parsed.data.title || postLabel(post) });
  refreshSite();
  return { ok: true };
}

export async function publishPostAdminAction(postId: string): Promise<AdminResult> {
  const actor = await requireAdmin();
  const post = await loadPost(postId);
  if (!post) return NOT_FOUND;
  if (post.status === 'published') return { ok: true };

  if (!post.title.trim()) return { ok: false, error: 'სტატიას სათაური არ აქვს.' };
  if (isBlankHtml(post.contentHtml)) return { ok: false, error: 'სტატია ცარიელია.' };

  // As the author's own publish does: the slug is minted once, on first publish.
  const slug = post.publishedAt ? post.slug : `${slugify(post.title)}-${randomSuffix(6)}`;
  await db
    .update(posts)
    .set({ status: 'published', slug, publishedAt: post.publishedAt ?? new Date() })
    .where(eq(posts.id, post.id));

  await logAdmin(actor, 'post.publish', { type: 'post', id: post.id, label: postLabel(post) });
  refreshSite();
  return { ok: true };
}

export async function unpublishPostsAction(ids: string[]): Promise<AdminResult> {
  const actor = await requireAdmin();
  const clean = cleanIds(ids);
  if (clean.length === 0) return { ok: true, count: 0 };

  const live = await db
    .select({ id: posts.id, title: posts.title, pendingRevision: posts.pendingRevision })
    .from(posts)
    .where(and(inArray(posts.id, clean), eq(posts.status, 'published')));

  for (const post of live) {
    await unpublish(post);
    await logAdmin(actor, 'post.unpublish', { type: 'post', id: post.id, label: postLabel(post) });
  }

  refreshSite();
  return { ok: true, count: live.length };
}

export async function discardPendingRevisionAction(postId: string): Promise<AdminResult> {
  const actor = await requireAdmin();
  const post = await loadPost(postId);
  if (!post) return NOT_FOUND;

  await db.update(posts).set({ pendingRevision: null }).where(eq(posts.id, post.id));
  await logAdmin(actor, 'post.discard_pending', { type: 'post', id: post.id, label: postLabel(post) });
  revalidatePath(`/admin/posts/${post.id}`);
  return { ok: true };
}

export async function deletePostsAction(ids: string[]): Promise<AdminResult> {
  const actor = await requireAdmin();
  const clean = cleanIds(ids);
  if (clean.length === 0) return { ok: true, count: 0 };

  // Comments, likes, views and tags all cascade from the posts row.
  const removed = await db
    .delete(posts)
    .where(inArray(posts.id, clean))
    .returning({ id: posts.id, title: posts.title, authorId: posts.authorId });

  for (const post of removed) {
    await logAdmin(actor, 'post.delete', { type: 'post', id: post.id, label: postLabel(post) }, { authorId: post.authorId });
  }

  refreshSite();
  return { ok: true, count: removed.length };
}

/* ================================================================== comments */

export async function deleteCommentsAction(ids: string[]): Promise<AdminResult> {
  const actor = await requireAdmin();
  const clean = cleanIds(ids);
  if (clean.length === 0) return { ok: true, count: 0 };

  // Replies cascade from their parent.
  const removed = await db
    .delete(comments)
    .where(inArray(comments.id, clean))
    .returning({ id: comments.id, body: comments.body, postId: comments.postId, authorId: comments.authorId });

  for (const comment of removed) {
    await logAdmin(actor, 'comment.delete', { type: 'comment', id: comment.id, label: comment.body.slice(0, 120) }, {
      postId: comment.postId,
      authorId: comment.authorId,
    });
  }

  refreshSite();
  return { ok: true, count: removed.length };
}

/* ==================================================================== topics */

export async function saveTopicAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const values = echoValues(formData, 'name', 'slug', 'description');

  const parsed = topicSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug') ?? '',
    description: formData.get('description') ?? '',
    isFeatured: formData.get('isFeatured') === 'on',
  });
  if (!parsed.success) return zodToFormState(parsed.error, values);
  const input = { ...parsed.data, slug: parsed.data.slug || slugify(parsed.data.name, 40) };

  const TAKEN: FormState = { ok: false, error: 'ამ სახელით ან მისამართით თემა უკვე არსებობს.', values };

  const [clash] = await db
    .select({ id: topics.id })
    .from(topics)
    .where(
      and(
        sql`(lower(${topics.name}) = lower(${input.name}) or ${topics.slug} = ${input.slug})`,
        isUuid(id) ? ne(topics.id, id) : undefined,
      ),
    )
    .limit(1);
  if (clash) return TAKEN;

  try {
    if (isUuid(id)) {
      const [updated] = await db.update(topics).set(input).where(eq(topics.id, id)).returning({ id: topics.id });
      if (!updated) return { ok: false, error: NOT_FOUND.error, values };
      // Posts carry topic names in their search text; rename them there too.
      await db.execute(sql`
        update posts p set topics_text = coalesce((
          select string_agg(t.name, ' ') from post_topics pt join topics t on t.id = pt.topic_id where pt.post_id = p.id
        ), '')
        where p.id in (select post_id from post_topics where topic_id = ${id}::uuid)
      `);
      await logAdmin(actor, 'topic.update', { type: 'topic', id, label: input.name });
    } else {
      const [created] = await db.insert(topics).values(input).returning({ id: topics.id });
      await logAdmin(actor, 'topic.create', { type: 'topic', id: created.id, label: input.name });
    }
  } catch (error) {
    if (isUniqueViolation(error)) return TAKEN;
    throw error;
  }

  refreshSite();
  return { ok: true };
}

export async function setTopicFeaturedAction(topicId: string, featured: boolean): Promise<AdminResult> {
  const actor = await requireAdmin();
  if (!isUuid(topicId)) return NOT_FOUND;
  const [row] = await db
    .update(topics)
    .set({ isFeatured: featured })
    .where(eq(topics.id, topicId))
    .returning({ name: topics.name });
  if (!row) return NOT_FOUND;

  await logAdmin(actor, 'topic.update', { type: 'topic', id: topicId, label: row.name }, { featured });
  refreshSite();
  return { ok: true };
}

/** Removes the topic and its tags; the posts themselves stay. */
export async function deleteTopicAction(topicId: string): Promise<AdminResult> {
  const actor = await requireAdmin();
  if (!isUuid(topicId)) return NOT_FOUND;
  const [row] = await db.delete(topics).where(eq(topics.id, topicId)).returning({ name: topics.name });
  if (!row) return NOT_FOUND;

  await logAdmin(actor, 'topic.delete', { type: 'topic', id: topicId, label: row.name });
  refreshSite();
  return { ok: true };
}
