import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { topics } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { OnboardingFlow } from '@/components/onboarding-flow';
import { SceneShell } from '@/components/scene-shell';

export const metadata: Metadata = { title: 'დაწყება' };

export default async function OnboardingPage() {
  const user = await requireUser('/onboarding');
  // Onboarding is asked once; after that, interests are edited in settings.
  if (user.onboardedAt) redirect('/settings#interests');

  const featured = await db
    .select({ id: topics.id, slug: topics.slug, name: topics.name })
    .from(topics)
    .where(eq(topics.isFeatured, true))
    .orderBy(desc(topics.postCount), topics.name);

  // Same frame as sign-up, which sends people straight here.
  return (
    <SceneShell wide className="onboarding">
      <OnboardingFlow topics={featured} firstName={user.name.split(' ')[0]} />
    </SceneShell>
  );
}
