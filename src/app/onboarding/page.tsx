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
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="flex h-16 items-center border-b border-line px-4 sm:px-6">
        <Link href="/" className="inline-flex" aria-label="Dawere — მთავარი">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <OnboardingFlow topics={featured} firstName={user.name.split(' ')[0]} />
      </main>
    </div>
  );
}
