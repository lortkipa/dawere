'use server';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, isUniqueViolation } from '@/db';
import { users } from '@/db/schema';
import {
  burnPasswordCheck,
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from '@/lib/auth';
import { TOO_MANY, clientIp, rateLimit } from '@/lib/rate-limit';
import {
  echoValues,
  signInSchema,
  signUpSchema,
  zodToFormState,
  type FormState,
} from '@/lib/validation';
import { randomSuffix, safeNext, slugify } from '@/lib/utils';

/** Derives a unique @handle from the display name. */
async function uniqueUsername(name: string): Promise<string> {
  const base = slugify(name, 20).replace(/-/g, '_') || 'writer';
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? base : `${base}_${randomSuffix(4)}`;
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, candidate)).limit(1);
    if (!taken) return candidate;
  }
  return `writer_${randomSuffix(8)}`;
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData, 'name', 'email');

  if (!(await rateLimit(`signup:ip:${await clientIp()}`, 8, 3600))) {
    return { ok: false, error: TOO_MANY, values };
  }

  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) return zodToFormState(parsed.error, values);
  const { name, email, password } = parsed.data;

  const EMAIL_TAKEN: FormState = {
    ok: false,
    fieldErrors: { email: 'ამ ელფოსტაზე ანგარიში უკვე არსებობს. სცადე შესვლა.' },
    values,
  };

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return EMAIL_TAKEN;

  let createdId: string;
  try {
    const [created] = await db
      .insert(users)
      .values({
        email,
        name,
        username: await uniqueUsername(name),
        passwordHash: await hashPassword(password),
      })
      .returning({ id: users.id });
    createdId = created.id;
  } catch (error) {
    // Two sign-ups for one address raced past the existence check.
    if (isUniqueViolation(error)) return EMAIL_TAKEN;
    throw error;
  }

  await createSession(createdId);
  // New accounts always land on the interest picker; it seeds their feed.
  redirect('/onboarding');
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = echoValues(formData, 'email');
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) return zodToFormState(parsed.error, values);
  const { email, password } = parsed.data;

  // Per address and per account: an attacker rotating IPs still hits the second.
  const [ipOk, accountOk] = await Promise.all([
    rateLimit(`signin:ip:${await clientIp()}`, 30, 600),
    rateLimit(`signin:email:${email}`, 10, 900),
  ]);
  if (!ipOk || !accountOk) return { ok: false, error: TOO_MANY, values };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  // Same message either way: do not leak which emails have accounts.
  const INVALID: FormState = {
    ok: false,
    error: 'ეს ელფოსტა და პაროლი ვერცერთ ანგარიშს ვერ დაემთხვა.',
    values,
  };
  if (!user) {
    await burnPasswordCheck(password);
    return INVALID;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return INVALID;

  await createSession(user.id);
  redirect(user.onboardedAt ? safeNext(formData.get('next')) : '/onboarding');
}

export async function signOutAction() {
  await destroySession();
  redirect('/');
}
