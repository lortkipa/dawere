'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { db, isUniqueViolation } from '@/db';
import { topics, users } from '@/db/schema';
import {
  clearSessionCookie,
  hashPassword,
  requireUser,
  revokeOtherSessions,
  verifyPassword,
} from '@/lib/auth';
import { SIGNAL, forgetTopics, recordTopicSignal } from '@/lib/interests';
import { TOO_MANY, rateLimit } from '@/lib/rate-limit';
import {
  deleteAccountSchema,
  echoValues,
  passwordChangeSchema,
  profileSchema,
  zodToFormState,
  type FormState,
} from '@/lib/validation';
import { deleteImagesOwnedBy, storeImage } from '@/lib/storage';

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = echoValues(formData, 'name', 'username', 'bio', 'location', 'website');

  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    username: formData.get('username'),
    bio: formData.get('bio') ?? '',
    location: formData.get('location') ?? '',
    website: formData.get('website') ?? '',
  });

  if (!parsed.success) return zodToFormState(parsed.error, values);
  const { name, username, bio, location, website } = parsed.data;

  const TAKEN: FormState = { ok: false, fieldErrors: { username: 'ეს მომხმარებლის სახელი დაკავებულია.' }, values };

  const [clash] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.username, username), ne(users.id, user.id)))
    .limit(1);
  if (clash) return TAKEN;

  try {
    await db.update(users).set({ name, username, bio, location, website }).where(eq(users.id, user.id));
  } catch (error) {
    // Someone claimed the handle between the check and the write.
    if (isUniqueViolation(error)) return TAKEN;
    throw error;
  }

  revalidatePath('/', 'layout');
  return { ok: true, values: { name, username, bio, location, website } };
}

export async function updateAvatarAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const file = formData.get('avatar');

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'ჯერ აირჩიე სურათი.' };
  }
  if (!(await rateLimit(`upload:${user.id}`, 30, 600))) return { ok: false, error: TOO_MANY };

  const stored = await storeImage(file, user.id);
  if ('error' in stored) return { ok: false, error: stored.error };

  await db.update(users).set({ avatarUrl: stored.url }).where(eq(users.id, user.id));

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function removeAvatarAction(): Promise<FormState> {
  const user = await requireUser();
  await db.update(users).set({ avatarUrl: null }).where(eq(users.id, user.id));
  revalidatePath('/', 'layout');
  return { ok: true };
}

/**
 * The settings form sends only what changed: topics switched on get the same
 * boost as an onboarding pick, topics switched off are forgotten entirely.
 */
export async function updateInterestsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const slugs = (key: string) => formData.getAll(key).filter((v): v is string => typeof v === 'string');
  const add = slugs('add');
  const remove = slugs('remove');

  if (add.length + remove.length === 0) return { ok: true };

  const found = await db
    .select({ id: topics.id, slug: topics.slug })
    .from(topics)
    .where(inArray(topics.slug, [...add, ...remove]));
  const idsFor = (list: string[]) => found.filter((t) => list.includes(t.slug)).map((t) => t.id);

  await Promise.all([
    recordTopicSignal(user.id, idsFor(add), SIGNAL.chosen),
    forgetTopics(user.id, idsFor(remove)),
  ]);

  revalidatePath('/settings');
  return { ok: true };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  if (!(await rateLimit(`password:${user.id}`, 6, 900))) return { ok: false, error: TOO_MANY };

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) return zodToFormState(parsed.error);

  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { ok: false, fieldErrors: { currentPassword: 'ეს შენი მიმდინარე პაროლი არ არის.' } };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword) })
    .where(eq(users.id, user.id));

  // A changed password is usually a response to someone else knowing the old one.
  await revokeOtherSessions(user.id);
  revalidatePath('/settings');
  return { ok: true };
}

export async function signOutOthersAction(): Promise<FormState> {
  const user = await requireUser();
  await revokeOtherSessions(user.id);
  revalidatePath('/settings');
  return { ok: true };
}

/** Removes the account and everything it wrote; the schema cascades the rest. */
export async function deleteAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  if (!(await rateLimit(`delete-account:${user.id}`, 5, 900))) return { ok: false, error: TOO_MANY };

  const parsed = deleteAccountSchema.safeParse({
    password: formData.get('password'),
    confirm: String(formData.get('confirm') ?? '').trim(),
  });
  if (!parsed.success) return zodToFormState(parsed.error, echoValues(formData, 'confirm'));

  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { ok: false, fieldErrors: { password: 'პაროლი არასწორია.' }, values: echoValues(formData, 'confirm') };
  }

  await deleteImagesOwnedBy(user.id);
  await db.delete(users).where(eq(users.id, user.id));
  await clearSessionCookie();
  revalidatePath('/', 'layout');
  redirect('/?goodbye=1');
}
