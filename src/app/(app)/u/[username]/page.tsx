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

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <header className="border-b border-line pb-8">
        <div className="flex items-start justify-between gap-4">
          <Avatar name={profile.name} src={profile.avatarUrl} size="xl" className="size-20 text-2xl sm:size-24 sm:text-3xl" />
          <div className="flex items-center gap-2">
            {isSelf ? (
              <ButtonLink href="/settings" variant="outline" size="sm">
                <Settings />
                <span>
                  <span className="hidden sm:inline">პროფილის </span>რედაქტირება
                </span>
              </ButtonLink>
            ) : (
              <>
                <ReportButton targetType="user" targetId={profile.id} signedIn={Boolean(viewer)} variant="icon" />
                <FollowButton
                  authorId={profile.id}
                  initialFollowing={Boolean(s?.follows_viewer)}
                  signedIn={Boolean(viewer)}
                  size="md"
                />
              </>
            )}
          </div>
        </div>

        <h1 className="mt-5 text-[1.75rem] leading-tight font-bold tracking-tight text-ink">{profile.name}</h1>
        <p className="text-[15px] text-subtle">@{profile.username}</p>

        {profile.bio ? <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink/85">{profile.bio}</p> : null}

        <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {counts.map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-1.5">
              <dd className="font-semibold text-ink tabular-nums">{formatCount(value)}</dd>
              <dt className="text-muted">{label}</dt>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-subtle">
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
      </header>

      {isSelf && (s?.drafts ?? 0) > 0 ? (
        <Tabs
          className="mt-2"
          active={tab}
          tabs={[
            {
              key: 'posts',
              label: `გამოქვეყნებული (${s?.posts ?? 0})`,
              href: `/u/${profile.username}`,
            },
            {
              key: 'drafts',
              label: `მონახაზები (${s?.drafts ?? 0})`,
              href: `/u/${profile.username}?tab=drafts`,
            },
          ]}
        />
      ) : null}

      <div className="mt-4">
        <PostCardList
          posts={feed.posts}
          signedIn={Boolean(viewer)}
          emptyState={
            <EmptyState
              className="mt-4"
              icon={<PenLine />}
              title={isSelf ? 'ჯერ არაფერი გამოგიქვეყნებია' : 'ჯერ არაფერია გამოქვეყნებული'}
              action={
                isSelf ? (
                  <ButtonLink href="/write" prefetch={false}>
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
