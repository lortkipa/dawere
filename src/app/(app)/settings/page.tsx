import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import { countOtherSessions, requireUser } from '@/lib/auth';
import { featuredTopics } from '@/lib/feed';
import { topInterests } from '@/lib/interests';
import {
  AvatarForm,
  DeleteAccountForm,
  InterestsForm,
  PasswordForm,
  ProfileForm,
  SessionsCard,
} from '@/components/settings-forms';
import { ButtonLink, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'პარამეტრები', robots: { index: false } };

const SECTIONS = [
  { id: 'profile', label: 'პროფილი' },
  { id: 'interests', label: 'ინტერესები' },
  { id: 'account', label: 'ანგარიში' },
];

export default async function SettingsPage() {
  const user = await requireUser('/settings');
  const [interests, featured, otherSessions] = await Promise.all([
    topInterests(user.id, 12),
    featuredTopics(30, { includeEmpty: true }),
    countOtherSessions(user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <PageHeader
        title="პარამეტრები"
        action={
          <ButtonLink href={`/u/${user.username}`} variant="outline" size="sm">
            <ExternalLink />
            პროფილის ნახვა
          </ButtonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-10">
        <nav aria-label="პარამეტრების განყოფილებები" className="sticky top-14 z-10 -mx-4 border-b border-line bg-surface/90 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 md:top-0 lg:top-8 lg:mx-0 lg:self-start lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <ul className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:bg-hover hover:text-ink"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-10">
          <section id="profile" className="scroll-mt-24 space-y-4">
            <AvatarForm name={user.name} avatarUrl={user.avatarUrl} />
            <ProfileForm
              initial={{
                name: user.name,
                username: user.username,
                bio: user.bio,
                location: user.location,
                website: user.website,
              }}
            />
          </section>

          <InterestsForm
            interests={interests.map(({ slug, name }) => ({ slug, name }))}
            suggestions={featured.map(({ slug, name }) => ({ slug, name }))}
          />

          <section id="account" className="scroll-mt-24 space-y-4">
            <div className="rounded-xl border border-line bg-sunken px-5 py-3.5 text-sm text-muted">
              შესული ხარ როგორც <span className="font-medium text-ink">{user.email}</span>
            </div>
            <PasswordForm />
            <SessionsCard otherSessions={otherSessions} />
            <DeleteAccountForm />
          </section>
        </div>
      </div>
    </main>
  );
}
