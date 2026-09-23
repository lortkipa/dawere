import type { CSSProperties } from 'react';
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
import { Avatar, ButtonLink, EmptyState } from '@/components/ui';
import { DEFAULT_SHARE_IMAGE } from '@/lib/site';
import { formatCount, formatMonthYear, pageParam, seedHue } from '@/lib/utils';

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

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-12 sm:px-6 sm:pt-6">
      <header>
        <div
          className="topic-art h-32 rounded-3xl border border-line/60 sm:h-44"
          style={{ '--hue': seedHue(profile.name) } as CSSProperties}
          aria-hidden
        />

        <div className="-mt-12 flex items-end justify-between gap-4 px-2 sm:-mt-14 sm:px-6">
          <Avatar
            name={profile.name}
            src={profile.avatarUrl}
            size="xl"
            className="size-24 text-3xl ring-4 ring-surface sm:size-28"
          />
          <div className="flex items-center gap-2 pb-1">
            {isSelf ? (
              <ButtonLink href="/settings" variant="outline" size="sm">
                <Settings />
                <span>
                  <span className="hidden sm:inline">პროფილის </span>რედაქტირება
                </span>
              </ButtonLink>
            ) : (
              <FollowButton
                authorId={profile.id}
                initialFollowing={Boolean(s?.follows_viewer)}
                signedIn={Boolean(viewer)}
                size="md"
              />
            )}
          </div>
        </div>

        <div className="mt-4 px-2 sm:px-6">
          <h1 className="font-serif text-[1.9rem] leading-tight font-bold tracking-tight text-ink">{profile.name}</h1>
          <p className="text-[15px] text-subtle">@{profile.username}</p>

          {profile.bio ? (
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink/85">{profile.bio}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-subtle">
            {profile.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" />
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
                <LinkIcon className="size-4 shrink-0" />
                <span className="truncate">{profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
              </a>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              შემოგვიერთდა {formatMonthYear(profile.createdAt)}
            </span>
          </div>

          <dl className="mt-6 grid max-w-md grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-raised shadow-soft">
            {[
              ['სტატია', s?.posts ?? 0],
              ['გამომწერი', s?.followers ?? 0],
              ['გამოწერილი', s?.following ?? 0],
            ].map(([label, value]) => (
              <div key={label as string} className="flex flex-col-reverse px-2 py-3 text-center">
                <dt className="text-[12px] whitespace-nowrap text-subtle">{label}</dt>
                <dd className="text-lg font-bold text-ink tabular-nums">{formatCount(value as number)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="mt-10 px-0 sm:px-6">
        {isSelf && (s?.drafts ?? 0) > 0 ? (
          <Tabs
            className="mb-7"
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

        <PostCardList
          posts={feed.posts}
          signedIn={Boolean(viewer)}
          emptyState={
            <EmptyState
              icon={<PenLine />}
              title={isSelf ? 'ჯერ არაფერი გამოგიქვეყნებია' : 'ჯერ არაფერია გამოქვეყნებული'}
              action={isSelf ? <ButtonLink href="/write">დაწერე პირველი</ButtonLink> : undefined}
            />
          }
        />

        {feed.posts.length > 0 ? (
          <div className="mt-8">
            <Pagination
              basePath={`/u/${profile.username}${tab === 'drafts' ? '?tab=drafts' : ''}`}
              page={page}
              hasMore={feed.hasMore}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}
