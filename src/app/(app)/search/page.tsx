import type { Metadata } from 'next';
import Link from 'next/link';
import { after } from 'next/server';
import { SearchX } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { searchEverything, type PersonHit, type SearchSort } from '@/lib/search';
import { recordSearchSignal } from '@/lib/interests';
import { featuredTopics, latestFeed } from '@/lib/feed';
import { Avatar, Card, Chip, EmptyState, SectionHeading } from '@/components/ui';
import { topicEmoji } from '@/lib/topic-art';
import { FollowButton } from '@/components/engage-buttons';
import { HighlightText } from '@/components/highlight-text';
import { Pagination, Tabs } from '@/components/feed-tabs';
import { PostCard } from '@/components/post-card';
import { SearchField } from '@/components/search-field';
import { cn, formatCount, pageParam } from '@/lib/utils';

const PAGE_SIZE = 10;

/** How many people the "all" tab shows before pointing at the people tab. */
const PEOPLE_PREVIEW = 3;

const TABS = [
  { key: 'all', label: 'ყველა' },
  { key: 'posts', label: 'სტატიები' },
  { key: 'people', label: 'ავტორები' },
  { key: 'topics', label: 'თემები' },
] as const;

type Tab = (typeof TABS)[number]['key'];

const SORTS: { key: SearchSort; label: string }[] = [
  { key: 'relevance', label: 'რელევანტური' },
  { key: 'recent', label: 'უახლესი' },
  { key: 'popular', label: 'პოპულარული' },
];

export async function generateMetadata(props: PageProps<'/search'>): Promise<Metadata> {
  const { q } = await props.searchParams;
  const query = typeof q === 'string' ? q.trim().slice(0, 60) : '';
  return query ? { title: `${query} — ძიება`, robots: { index: false } } : { title: 'აღმოაჩინე' };
}

function searchHref(query: string, { tab = 'all', sort = 'relevance' }: { tab?: Tab; sort?: SearchSort } = {}) {
  const params = new URLSearchParams({ q: query });
  if (tab !== 'all') params.set('tab', tab);
  if (sort !== 'relevance') params.set('sort', sort);
  return `/search?${params}`;
}

type TopicLink = { id: string; slug: string; name: string };

function TopicGrid({ topics }: { topics: TopicLink[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {topics.map((topic) => (
        <li key={topic.id}>
          {/* Stacked on phones: two columns leave too little room beside the glyph
              for long Georgian words, which would otherwise break mid-word. */}
          <Link
            href={`/topic/${topic.slug}`}
            className="group flex h-full flex-col items-start gap-2.5 rounded-xl border border-line bg-raised p-3 transition-colors hover:border-line-strong hover:bg-hover sm:flex-row sm:items-center sm:gap-3 sm:p-2.5 sm:pr-3"
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sunken text-xl transition-colors group-hover:bg-raised"
              aria-hidden
            >
              {topicEmoji(topic.slug)}
            </span>
            <span className="min-w-0 text-sm leading-snug font-medium text-ink">{topic.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TopicChips({ topics, className }: { topics: TopicLink[]; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {topics.map((topic) => (
        <Link key={topic.id} href={`/topic/${topic.slug}`}>
          <Chip>
            <span className="mr-1.5" aria-hidden>
              {topicEmoji(topic.slug)}
            </span>
            {topic.name}
          </Chip>
        </Link>
      ))}
    </div>
  );
}

function PeopleList({
  people,
  viewerId,
  withBio,
}: {
  people: PersonHit[];
  viewerId: string | null;
  withBio: boolean;
}) {
  return (
    <Card>
      <ul className="divide-y divide-line">
        {people.map((person) => (
          <li key={person.id} className="flex items-center gap-3.5 px-4 py-3.5">
            <Link href={`/u/${person.username}`} className="shrink-0">
              <Avatar name={person.name} src={person.avatarUrl} size="md" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/u/${person.username}`}
                className="text-[15px] font-medium text-ink transition-colors hover:text-accent"
              >
                {person.name}
              </Link>
              <p className="text-[13px] text-subtle">
                @{person.username} ·{' '}
                <span className="whitespace-nowrap">{formatCount(person.followerCount)} გამომწერი</span>
              </p>
              {withBio && person.bio ? (
                <p className="mt-1.5 line-clamp-2 text-sm text-muted">{person.bio}</p>
              ) : null}
            </div>
            {viewerId === person.id ? null : (
              <FollowButton
                authorId={person.id}
                initialFollowing={person.followedByMe}
                signedIn={Boolean(viewerId)}
              />
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SortControl({ query, tab, sort }: { query: string; tab: Tab; sort: SearchSort }) {
  return (
    <nav aria-label="დალაგება" className="flex rounded-full border border-line bg-sunken p-0.5">
      {SORTS.map((option) => {
        const active = option.key === sort;
        return (
          <Link
            key={option.key}
            href={searchHref(query, { tab, sort: option.key })}
            aria-current={active ? 'true' : undefined}
            scroll={false}
            className={cn(
              'rounded-full px-3 py-1 text-[13px] font-medium whitespace-nowrap transition-colors',
              active ? 'bg-raised text-ink shadow-sm shadow-black/5' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

const EXPLORE_PAGE_SIZE = 8;

/**
 * /search with no query: the way in for anyone without a feed. Every editorial
 * topic (empty ones included — their pages invite the first post), then the
 * newest writing once there is some.
 */
async function Explore({ page }: { page: number }) {
  const user = await getCurrentUser();
  const [topics, latest] = await Promise.all([
    featuredTopics(30, { includeEmpty: true }),
    latestFeed(user?.id ?? null, EXPLORE_PAGE_SIZE, (page - 1) * EXPLORE_PAGE_SIZE),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pt-12 pb-20 sm:px-6 sm:pt-16">
      <h1 className="text-center font-serif text-3xl font-semibold text-ink sm:text-4xl">რას ეძებ?</h1>
      <SearchField autoFocus={page === 1} className="mx-auto mt-8 max-w-2xl" />

      {page === 1 && topics.length > 0 ? (
        <section className="mt-14">
          <SectionHeading>თემები</SectionHeading>
          <ul className="flex flex-wrap gap-2.5">
            {topics.map((topic) => (
              <li key={topic.id}>
                <Link
                  href={`/topic/${topic.slug}`}
                  className="flex items-center gap-2 rounded-full border border-line bg-raised px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent/40 hover:text-accent"
                >
                  <span className="text-base leading-none" aria-hidden>
                    {topicEmoji(topic.slug)}
                  </span>
                  {topic.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {latest.posts.length > 0 ? (
        <section className="mt-14">
          <SectionHeading>უახლესი ტექსტები</SectionHeading>
          <div>
            {latest.posts.map((post) => (
              <PostCard key={post.id} post={post} signedIn={Boolean(user)} />
            ))}
          </div>
          <div className="mt-8">
            <Pagination basePath="/search" page={page} hasMore={latest.hasMore} />
          </div>
        </section>
      ) : page > 1 ? (
        <EmptyState
          className="mt-14"
          icon={<SearchX />}
          title="ამ გვერდზე ტექსტები აღარ არის"
          action={
            <Link href="/search" className="text-sm font-medium text-accent hover:underline">
              დასაწყისში დაბრუნება
            </Link>
          }
        />
      ) : null}
    </main>
  );
}

export default async function SearchPage(props: PageProps<'/search'>) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === 'string' ? searchParams.q.trim().slice(0, 200) : '';

  if (!query) return <Explore page={pageParam(searchParams.page)} />;

  const user = await getCurrentUser();
  const viewerId = user?.id ?? null;
  const tab: Tab = TABS.find((t) => t.key === searchParams.tab)?.key ?? 'all';
  const sort: SearchSort = SORTS.find((s) => s.key === searchParams.sort)?.key ?? 'relevance';
  const page = pageParam(searchParams.page);

  const results = await searchEverything(viewerId, query, {
    sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  // Teach the feed what this reader is looking for — after the response ships,
  // and only for the first page so paging does not count as repeated interest.
  if (page === 1) {
    after(() => recordSearchSignal(viewerId, query));
  }

  const nothing = results.posts.length === 0 && results.people.length === 0 && results.topics.length === 0;
  const people = tab === 'all' ? results.people.slice(0, PEOPLE_PREVIEW) : results.people;
  const showPeople = (tab === 'all' || tab === 'people') && people.length > 0;
  const showTopics = (tab === 'all' || tab === 'topics') && results.topics.length > 0;
  const showPosts = (tab === 'all' || tab === 'posts') && results.posts.length > 0;
  const tabIsEmpty =
    !nothing &&
    ((tab === 'posts' && !showPosts) || (tab === 'people' && !showPeople) || (tab === 'topics' && !showTopics));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pt-8 pb-16 sm:px-6 sm:pt-10">
      <SearchField key={query} defaultValue={query} tab={tab} />

      <Tabs
        className="mt-6"
        active={tab}
        tabs={TABS.map((t) => ({ ...t, href: searchHref(query, { tab: t.key, sort }) }))}
      />

      <div className="mt-8 space-y-12">
        {nothing ? (
          <EmptyState
            icon={<SearchX />}
            title={`„${query}“ ვერაფერს დაემთხვა`}
            description={
              results.didYouMean ? (
                <>
                  იქნებ იგულისხმე{' '}
                  <Link href={searchHref(results.didYouMean)} className="font-medium text-accent hover:underline">
                    {results.didYouMean}
                  </Link>
                  ?
                </>
              ) : (
                'სცადე სხვა სიტყვა ან დაათვალიერე თემები.'
              )
            }
            action={<TopicChips topics={await featuredTopics(8, { includeEmpty: true })} className="justify-center" />}
          />
        ) : null}

        {tabIsEmpty ? (
          <EmptyState
            icon={<SearchX />}
            title={
              tab === 'people'
                ? 'ამ ძიებით ავტორი არ მოიძებნა'
                : tab === 'topics'
                  ? 'ამ ძიებით თემა არ მოიძებნა'
                  : 'ამ ძიებით სტატია არ მოიძებნა'
            }
            description={
              <Link href={searchHref(query)} className="font-medium text-accent hover:underline">
                ყველა შედეგის ნახვა
              </Link>
            }
          />
        ) : null}

        {showPeople ? (
          <section>
            {tab === 'all' ? (
              <SectionHeading
                action={
                  results.people.length > PEOPLE_PREVIEW ? (
                    <Link
                      href={searchHref(query, { tab: 'people' })}
                      className="text-[13px] font-medium text-muted transition-colors hover:text-ink"
                    >
                      ყველა →
                    </Link>
                  ) : null
                }
              >
                ავტორები
              </SectionHeading>
            ) : null}
            <PeopleList people={people} viewerId={viewerId} withBio={tab === 'people'} />
          </section>
        ) : null}

        {showTopics ? (
          <section>
            {tab === 'all' ? (
              <>
                <SectionHeading>თემები</SectionHeading>
                <TopicChips topics={results.topics} />
              </>
            ) : (
              <TopicGrid topics={results.topics} />
            )}
          </section>
        ) : null}

        {showPosts ? (
          <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">
                {formatCount(results.totalPosts)} სტატია
              </h2>
              <SortControl query={query} tab={tab} sort={sort} />
            </div>

            <div>
              {results.posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  signedIn={Boolean(user)}
                  href={`/p/${post.slug}?from=search`}
                  excerpt={post.headline ? <HighlightText text={post.headline} /> : undefined}
                />
              ))}
            </div>

            <div className="mt-8">
              <Pagination
                basePath={searchHref(query, { tab, sort })}
                page={page}
                hasMore={results.hasMore}
                labels={{ prev: 'წინა', next: 'შემდეგი' }}
              />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
