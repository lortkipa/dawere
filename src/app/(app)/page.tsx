import { PenLine } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import {
  followingFeed,
  forYouFeed,
  latestFeed,
  publishedPostCount,
  type FeedKind,
} from '@/lib/feed';
import { pageParam } from '@/lib/utils';
import { PostCardList } from '@/components/post-card';
import { Sidebar } from '@/components/sidebar';
import { Pagination, Tabs } from '@/components/feed-tabs';
import { Landing } from '@/components/landing';
import { ButtonLink, EmptyState } from '@/components/ui';

const PAGE_SIZE = 10;

/**
 * No "popular" tab: with a young catalogue, popularity only reshuffles the
 * same handful of posts. trendingFeed still powers the sidebar once there is
 * enough to rank.
 */
const TABS: { key: Exclude<FeedKind, 'trending'>; label: string }[] = [
  { key: 'for-you', label: 'შენთვის' },
  { key: 'following', label: 'გამოწერილები' },
  { key: 'latest', label: 'უახლესი' },
];

export default async function HomePage(props: PageProps<'/'>) {
  const user = await getCurrentUser();
  const searchParams = await props.searchParams;
  // Signed-out visitors get the cover page.
  if (!user) return <Landing farewell={searchParams.goodbye === '1'} />;

  const requested = typeof searchParams.tab === 'string' ? searchParams.tab : null;
  const tab = TABS.find((t) => t.key === requested)?.key ?? 'for-you';

  const page = pageParam(searchParams.page);
  const offset = (page - 1) * PAGE_SIZE;

  const feed = await (tab === 'for-you'
    ? forYouFeed(user.id, PAGE_SIZE, offset)
    : tab === 'following'
      ? followingFeed(user.id, PAGE_SIZE, offset)
      : latestFeed(user.id, PAGE_SIZE, offset));

  // An empty feed on an empty site deserves a different message from an empty
  // feed on a busy one; only ask when the feed came back empty.
  const siteIsEmpty = feed.posts.length === 0 && page === 1 && (await publishedPostCount()) === 0;

  const emptyState = siteIsEmpty ? (
    <EmptyState
      title="აქ ჯერ არაფერი გამოქვეყნებულა"
      description="Dawere ახლა იწყება. პირველი ტექსტი შეიძლება შენი იყოს."
      action={
        <>
          <ButtonLink href="/write" prefetch={false}>
            <PenLine />
            დაწერე პირველი
          </ButtonLink>
          <ButtonLink href="/search" variant="outline">
            თემების დათვალიერება
          </ButtonLink>
        </>
      }
    />
  ) : tab === 'following' ? (
    <EmptyState
      title="ჯერ არავინ გამოგიწერია"
      description="გამოიწერე ავტორები და მათი ახალი ტექსტები აქ მოგროვდება."
      action={
        <ButtonLink href="/search" variant="outline">
          იპოვე ავტორები
        </ButtonLink>
      }
    />
  ) : tab === 'for-you' ? (
    <EmptyState
      title="ნაკადი ჯერ ცარიელია"
      description="წაიკითხე რამდენიმე ტექსტი და ნაკადი შენს ინტერესებს მოერგება."
      action={
        <ButtonLink href="/?tab=latest" variant="outline">
          უახლესი ტექსტები
        </ButtonLink>
      }
    />
  ) : (
    <EmptyState
      title="ამ გვერდზე ტექსტები აღარ არის"
      action={
        <ButtonLink href="/?tab=latest" variant="outline">
          პირველ გვერდზე
        </ButtonLink>
      }
    />
  );

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 lg:px-10">
      <div className="grid gap-16 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="mx-auto w-full max-w-2xl min-w-0 pb-16 xl:mx-0 xl:max-w-none">
          <Tabs
            label="ნაკადი"
            className="sticky top-14 z-20 -mx-4 bg-surface/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:top-0 md:pt-8 md:pb-4 lg:-mx-10 lg:px-10 xl:mr-0"
            active={tab}
            tabs={TABS.map((t) => ({ ...t, href: t.key === 'for-you' ? '/' : `/?tab=${t.key}` }))}
          />

          <div className="mt-2">
            <PostCardList posts={feed.posts} signedIn emptyState={emptyState} />
          </div>

          {feed.posts.length > 0 ? (
            <div className="mt-6">
              <Pagination
                basePath={tab === 'for-you' ? '/' : `/?tab=${tab}`}
                page={page}
                hasMore={feed.hasMore}
              />
            </div>
          ) : null}
        </div>

        {/* Not sticky: the rail can outgrow the viewport, and a sticky element
            taller than the screen hides its own bottom half. */}
        <div className="hidden pt-10 pb-16 xl:block">
          <Sidebar userId={user.id} />
        </div>
      </div>
    </main>
  );
}
