import type { CSSProperties, ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { after } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { searchEverything, type PersonHit, type SearchSort } from '@/lib/search';
import { recordSearchSignal } from '@/lib/interests';
import { featuredTopics, latestFeed } from '@/lib/feed';
import { Avatar } from '@/components/ui';
import { FollowButton } from '@/components/engage-buttons';
import { HighlightText } from '@/components/highlight-text';
import { Pagination, Segmented } from '@/components/feed-tabs';
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

/** Topic links as soft pills, the same shape as the onboarding picker. */
function TopicPills({ topics, className }: { topics: TopicLink[]; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-2', className)}>
      {topics.map((topic) => (
        <li key={topic.id}>
          <Link
            href={`/topic/${topic.slug}`}
            className="inline-flex h-10 items-center rounded-full border border-transparent bg-sunken px-4 text-[14.5px] font-medium text-ink transition-[background-color,border-color] duration-200 hover:border-line-strong hover:bg-raised"
          >
            {topic.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Serif section title; `action` sits at the far end of the line. */
function SectionTitle({ children, action, center }: { children: ReactNode; action?: ReactNode; center?: boolean }) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-center gap-x-4 gap-y-3', center ? 'justify-center' : 'justify-between')}>
      <h2 className="headline text-[1.6rem] text-ink sm:text-[1.75rem]">{children}</h2>
      {action}
    </div>
  );
}

/** A quiet message in place of results: one serif line, one sentence, maybe a way on. */
function Nothing({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="animate-rise py-8 text-center sm:py-12">
      <h2 className="headline wrap-anywhere text-[1.6rem] text-ink sm:text-[1.9rem]">{title}</h2>
      {children}
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
    <ul className="divide-y divide-line">
      {people.map((person) => (
        <li key={person.id} className="flex items-center gap-3.5 py-4 first:pt-0 last:pb-0">
          <Link href={`/u/${person.username}`} className="shrink-0">
            <Avatar name={person.name} src={person.avatarUrl} size="md" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/u/${person.username}`} className="text-[15.5px] font-medium text-ink hover:underline">
              {person.name}
            </Link>
            <p className="text-[13px] text-subtle">
              @{person.username} ·{' '}
              <span className="whitespace-nowrap">{formatCount(person.followerCount)} გამომწერი</span>
            </p>
            {withBio && person.bio ? <p className="mt-1.5 line-clamp-2 text-sm text-muted">{person.bio}</p> : null}
          </div>
          {viewerId === person.id ? null : (
            <FollowButton authorId={person.id} initialFollowing={person.followedByMe} signedIn={Boolean(viewerId)} />
          )}
        </li>
      ))}
    </ul>
  );
}

/** Result kinds as a row of pills; each is a link, so every tab has a URL. */
function ResultTabs({ query, tab, sort }: { query: string; tab: Tab; sort: SearchSort }) {
  return (
    <nav aria-label="შედეგების ტიპი" className="no-scrollbar fade-x -mx-5 mt-5 overflow-x-auto px-5 sm:mx-0 sm:px-0 sm:[mask-image:none]">
      <div className="flex w-max gap-1.5">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Link
              key={t.key}
              href={searchHref(query, { tab: t.key, sort })}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex h-9 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors',
                active ? 'bg-primary text-primary-contrast' : 'text-muted hover:bg-hover hover:text-ink',
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SortControl({ query, tab, sort }: { query: string; tab: Tab; sort: SearchSort }) {
  return (
    <Segmented
      label="დალაგება"
      active={sort}
      options={SORTS.map((option) => ({ ...option, href: searchHref(query, { tab, sort: option.key }) }))}
    />
  );
}

const TEXT_LINK = 'font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink';

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
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-14 pb-24 sm:px-6 sm:pt-24">
      <div className="text-center">
        <h1 className="headline animate-rise text-[clamp(2.4rem,5.5vw,3.6rem)] text-ink">აღმოაჩინე</h1>
        <SearchField
          autoFocus={page === 1}
          className="animate-rise mt-8 text-left sm:mt-10"
          style={{ '--rise-delay': '90ms' } as CSSProperties}
        />
      </div>

      {page === 1 && topics.length > 0 ? (
        <section aria-labelledby="explore-topics" className="animate-rise mt-16 sm:mt-20" style={{ '--rise-delay': '180ms' } as CSSProperties}>
          <SectionTitle center>
            <span id="explore-topics">თემები</span>
          </SectionTitle>
          <TopicPills topics={topics} className="justify-center" />
        </section>
      ) : null}

      {latest.posts.length > 0 ? (
        <section aria-labelledby="explore-latest" className={page === 1 ? 'mt-20 sm:mt-24' : 'mt-14'}>
          <SectionTitle center>
            <span id="explore-latest">უახლესი ტექსტები</span>
          </SectionTitle>
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
        <div className="mt-10">
          <Nothing title="ამ გვერდზე ტექსტები აღარ არის">
            <p className="mt-4 text-[15px] text-muted">
              <Link href="/search" className={TEXT_LINK}>
                დასაწყისში დაბრუნება
              </Link>
            </p>
          </Nothing>
        </div>
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
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-8 pb-24 sm:px-6 sm:pt-12">
      <SearchField key={query} defaultValue={query} tab={tab} />
      <ResultTabs query={query} tab={tab} sort={sort} />

      <div className="mt-10 space-y-16 sm:mt-12">
        {nothing ? (
          <Nothing title={`„${query}“ ვერაფერს დაემთხვა`}>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted">
              {results.didYouMean ? (
                <>
                  იქნებ იგულისხმე{' '}
                  <Link href={searchHref(results.didYouMean)} className={TEXT_LINK}>
                    {results.didYouMean}
                  </Link>
                  ?
                </>
              ) : (
                'სცადე სხვა სიტყვა ან დაათვალიერე თემები.'
              )}
            </p>
            <TopicPills topics={await featuredTopics(8, { includeEmpty: true })} className="mt-8 justify-center" />
          </Nothing>
        ) : null}

        {tabIsEmpty ? (
          <Nothing
            title={
              tab === 'people'
                ? 'ამ ძიებით ავტორი არ მოიძებნა'
                : tab === 'topics'
                  ? 'ამ ძიებით თემა არ მოიძებნა'
                  : 'ამ ძიებით სტატია არ მოიძებნა'
            }
          >
            <p className="mt-4 text-[15px] text-muted">
              <Link href={searchHref(query)} className={TEXT_LINK}>
                ყველა შედეგის ნახვა
              </Link>
            </p>
          </Nothing>
        ) : null}

        {showPeople ? (
          <section>
            {tab === 'all' ? (
              <SectionTitle
                action={
                  results.people.length > PEOPLE_PREVIEW ? (
                    <Link
                      href={searchHref(query, { tab: 'people' })}
                      className="text-sm font-medium text-muted transition-colors hover:text-ink"
                    >
                      ყველა ავტორი
                    </Link>
                  ) : null
                }
              >
                ავტორები
              </SectionTitle>
            ) : null}
            <PeopleList people={people} viewerId={viewerId} withBio={tab === 'people'} />
          </section>
        ) : null}

        {showTopics ? (
          <section>
            {tab === 'all' ? <SectionTitle>თემები</SectionTitle> : null}
            <TopicPills topics={results.topics} />
          </section>
        ) : null}

        {showPosts ? (
          <section>
            <SectionTitle action={<SortControl query={query} tab={tab} sort={sort} />}>
              {formatCount(results.totalPosts)} სტატია
            </SectionTitle>

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
