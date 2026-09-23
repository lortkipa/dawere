'use server';

import { redirect } from 'next/navigation';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { topics, users } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { SIGNAL, recordTopicSignal } from '@/lib/interests';
import { DISCOVERY_KEYS, ROLE_KEYS } from '@/lib/onboarding-options';

const MINIMUM_TOPICS = 3;

type Role = 'reader' | 'writer' | 'both' | '';

/** Only values we offered are stored; anything else is treated as unanswered. */
function pick(value: FormDataEntryValue | null, allowed: readonly string[]): string {
  return typeof value === 'string' && allowed.includes(value) ? value : '';
}

/**
 * Saves every onboarding answer in one go. Topics are required (they seed the
 * feed); the other two questions are skippable and stay empty when skipped.
 */
export async function completeOnboardingAction(
  _prev: { ok: boolean; error?: string },
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const slugs = formData.getAll('topic').filter((v): v is string => typeof v === 'string');

  if (slugs.length < MINIMUM_TOPICS) {
    return { ok: false, error: `აირჩიე მინიმუმ ${MINIMUM_TOPICS} თემა.` };
  }

  const source = pick(formData.get('discoverySource'), DISCOVERY_KEYS);
  const note =
    source === 'other' ? String(formData.get('discoveryNote') ?? '').trim().slice(0, 120) : '';
  // The skip button is a submit of its own, so an accidental earlier pick does
  // not get saved when someone changes their mind at the last step.
  const role = (formData.get('skip') === 'role' ? '' : pick(formData.get('role'), ROLE_KEYS)) as Role;

  const chosen = await db.select({ id: topics.id }).from(topics).where(inArray(topics.slug, slugs));
  await recordTopicSignal(
    user.id,
    chosen.map((t) => t.id),
    SIGNAL.chosen,
  );

  await db
    .update(users)
    .set({
      onboardedAt: new Date(),
      ...(source ? { discoverySource: source, discoveryNote: note } : {}),
      ...(role ? { role } : {}),
    })
    .where(eq(users.id, user.id));

  redirect('/');
}
