import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { topics } from '@/db/schema';
import { requireUser } from '@/lib/auth';
import { OnboardingFlow } from '@/components/onboarding-flow';
import { Logo } from '@/components/logo';

export const metadata: Metadata = { title: 'დაწყება' };

export default async function OnboardingPage() {
  const user = await requireUser('/onboarding');
  // Onboarding is asked once; after that, interests are edited in settings.
  if (user.onboardedAt) redirect('/settings#interests');

  const featured = await db
    .select({ id: topics.id, slug: topics.slug, name: topics.name, description: topics.description })
    .from(topics)
    .where(eq(topics.isFeatured, true))
    .orderBy(desc(topics.postCount), topics.name);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:py-16">
      <Link href="/" className="inline-flex">
        <Logo />
      </Link>

      <div className="mt-12">
        <OnboardingFlow topics={featured} firstName={user.name.split(' ')[0]} />
      </div>
    </main>
  );
}
