import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { eq, sql } from 'drizzle-orm';
import { CalendarDays, LinkIcon, MapPin, PenLine, Settings } from 'lucide-react';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { authorFeed } from '@/lib/feed';
import { PostCardList } from '@/components/post-card';
import { Pagination, Tabs } from '@/components/feed-tabs';
import { FollowButton } from '@/components/engage-buttons';
import { ReportButton } from '@/components/report-dialog';
import { Avatar, ButtonLink, EmptyState } from '@/components/ui';
import { DEFAULT_SHARE_IMAGE } from '@/lib/site';
import { formatCount, formatMonthYear, pageParam } from '@/lib/utils';

const PAGE_SIZE = 10;

/** Memoised per request: generateMetadata and the page both look the user up. */
const findUser = cache(async (username: string) => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);
  return user ?? null;
});

export async function generateMetadata(props: PageProps<'/u/[username]'>): Promise<Metadata> {
  const { username } = await props.params;
  const user = await findUser(username);
  if (!user) return { title: 'პროფილი ვერ მოიძებნა' };
  const description = user.bio || `${user.name} წერს Dawere-ზე.`;
  return {
    title: `${user.name} (@${user.username})`,
    description,
    alternates: { canonical: `/u/${user.username}` },
    openGraph: {
      type: 'profile',
      title: user.name,
      description,
      url: `/u/${user.username}`,
      username: user.username,
      images: [user.avatarUrl ?? DEFAULT_SHARE_IMAGE],
    },
    // A square avatar suits the small card; the wide site card needs the large one.
    twitter: user.avatarUrl
      ? { card: 'summary', title: user.name, description, images: [user.avatarUrl] }
      : { card: 'summary_large_image', title: user.name, description },
  };
}

export default async function ProfilePage(props: PageProps<'/u/[username]'>) {
  const { username } = await props.params;
  const searchParams = await props.searchParams;
  const viewer = await getCurrentUser();
  const profile = await findUser(username);

  if (!profile) notFound();

  const isSelf = viewer?.id === profile.id;
  const tab = isSelf && searchParams.tab === 'drafts' ? 'drafts' : 'posts';
  const page = pageParam(searchParams.page);

  const [stats, feed] = await Promise.all([
    db.execute<{
      followers: number;
      following: number;
      posts: number;
      drafts: number;
      follows_viewer: boolean;
    }>(sql`
      select
        (select count(*)::int from follows where following_id = ${profile.id}::uuid) as followers,
        (select count(*)::int from follows where follower_id = ${profile.id}::uuid) as following,
        (select count(*)::int from posts where author_id = ${profile.id}::uuid and status = 'published') as posts,
        (select count(*)::int from posts where author_id = ${profile.id}::uuid and status = 'draft') as drafts,
        exists (
          select 1 from follows
          where following_id = ${profile.id}::uuid and follower_id = ${viewer?.id ?? null}::uuid
        ) as follows_viewer
    `),
    authorFeed(
      viewer?.id ?? null,
      profile.id,
      tab === 'drafts' ? 'draft' : 'published',
      PAGE_SIZE,
      (page - 1) * PAGE_SIZE,
    ),
  ]);

  const s = stats[0];

  const counts = [
    ['სტატია', s?.posts ?? 0],
    ['გამომწერი', s?.followers ?? 0],
    ['გამოწერილი', s?.following ?? 0],
  ] as const;

  const hasDrafts = isSelf && (s?.drafts ?? 0) > 0;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-12 pb-20 sm:px-6 sm:pt-20">
      <header className="animate-rise flex flex-col items-center text-center">
        <Avatar name={profile.name} src={profile.avatarUrl} size="xl" className="size-24 text-3xl sm:size-28 sm:text-4xl" />

        <h1 className="headline mt-6 text-[2.1rem] text-ink sm:text-[2.6rem]">{profile.name}</h1>
        <p className="mt-1 text-[15px] text-subtle">@{profile.username}</p>

        {profile.bio ? (
          <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-pretty text-muted">{profile.bio}</p>
        ) : null}

        <dl className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm">
          {counts.map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <dd className="font-semibold text-ink tabular-nums">{formatCount(value)}</dd>
              <dt className="text-muted">{label}</dt>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-subtle">
          {profile.location ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              {profile.location}
            </span>
          ) : null}
          {profile.website ? (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex max-w-full items-center gap-1.5 text-accent hover:underline"
            >
              <LinkIcon className="size-3.5 shrink-0" />
              <span className="truncate">{profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
            </a>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            შემოგვიერთდა {formatMonthYear(profile.createdAt)}
          </span>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          {isSelf ? (
            <ButtonLink href="/settings" variant="outline">
              <Settings />
              პროფილის რედაქტირება
            </ButtonLink>
          ) : (
            <>
              <FollowButton
                authorId={profile.id}
                initialFollowing={Boolean(s?.follows_viewer)}
                signedIn={Boolean(viewer)}
                size="md"
              />
              <ReportButton targetType="user" targetId={profile.id} signedIn={Boolean(viewer)} variant="icon" />
            </>
          )}
        </div>
      </header>

      {hasDrafts ? (
        <Tabs
          label="სტატიები"
          className="mt-14 flex justify-center"
          active={tab}
          tabs={[
            { key: 'posts', label: 'გამოქვეყნებული', count: s?.posts ?? 0, href: `/u/${profile.username}` },
            { key: 'drafts', label: 'მონახაზები', count: s?.drafts ?? 0, href: `/u/${profile.username}?tab=drafts` },
          ]}
        />
      ) : null}

      <div className={hasDrafts ? 'mt-6 border-t border-line pt-4' : 'mt-14 border-t border-line pt-4'}>
        <PostCardList
          posts={feed.posts}
          signedIn={Boolean(viewer)}
          emptyState={
            <EmptyState
              title={isSelf ? 'ჯერ არაფერი გამოგიქვეყნებია' : 'ჯერ არაფერია გამოქვეყნებული'}
              action={
                isSelf ? (
                  <ButtonLink href="/write" prefetch={false}>
                    <PenLine />
                    დაწერე პირველი
                  </ButtonLink>
                ) : undefined
              }
            />
          }
        />
      </div>

      {feed.posts.length > 0 ? (
        <div className="mt-6">
          <Pagination
            basePath={`/u/${profile.username}${tab === 'drafts' ? '?tab=drafts' : ''}`}
            page={page}
            hasMore={feed.hasMore}
          />
        </div>
      ) : null}
    </main>
  );
}
