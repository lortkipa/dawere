import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { PenLine } from 'lucide-react';
import { db } from '@/db';
import { topics } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { featuredTopics, topicFeed } from '@/lib/feed';
import { SIGNAL, isFollowingTopic, recordTopicSignal } from '@/lib/interests';
import { PostCardList } from '@/components/post-card';
import { Pagination } from '@/components/feed-tabs';
import { TopicFollowButton } from '@/components/engage-buttons';
import { ButtonLink, EmptyState, TopicPills } from '@/components/ui';
import { formatCount, pageParam } from '@/lib/utils';

const PAGE_SIZE = 12;

const findTopic = cache(async (slug: string) => {
  const [topic] = await db.select().from(topics).where(eq(topics.slug, slug)).limit(1);
  return topic ?? null;
});

export async function generateMetadata(props: PageProps<'/topic/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const topic = await findTopic(slug);
  if (!topic) return { title: 'თემა ვერ მოიძებნა' };
  return {
    title: topic.name,
    description: topic.description || `ტექსტები თემაზე „${topic.name}“.`,
    alternates: { canonical: `/topic/${topic.slug}` },
  };
}

export default async function TopicPage(props: PageProps<'/topic/[slug]'>) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const user = await getCurrentUser();
  const topic = await findTopic(slug);

  if (!topic) notFound();

  const page = pageParam(searchParams.page);
  const [feed, following, others] = await Promise.all([
    topicFeed(user?.id ?? null, slug, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    user ? isFollowingTopic(user.id, topic.id) : false,
    featuredTopics(14, { includeEmpty: true }),
  ]);

  // Browsing a topic is a mild interest signal — counted once, on the first page.
  if (user && page === 1) {
    after(() => recordTopicSignal(user.id, [topic.id], SIGNAL.view));
  }

  const related = others.filter((t) => t.id !== topic.id).slice(0, 10);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-12 pb-20 sm:px-6 sm:pt-20">
      <header className="animate-rise text-center">
        <Link href="/search" className="text-sm font-medium text-subtle transition-colors hover:text-ink">
          თემები
        </Link>
        <h1 className="headline mt-3 text-[2.4rem] text-ink sm:text-[3.2rem]">{topic.name}</h1>
        {topic.description ? (
          <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-pretty text-muted">{topic.description}</p>
        ) : null}
        <div className="mt-8 flex flex-col items-center gap-3">
          <TopicFollowButton topicId={topic.id} initialFollowing={following} signedIn={Boolean(user)} />
          {topic.postCount > 0 ? (
            <span className="text-[13px] text-subtle">{formatCount(topic.postCount)} სტატია</span>
          ) : null}
        </div>
      </header>

      <div className="mt-14 border-t border-line pt-4">
        <PostCardList
          posts={feed.posts}
          signedIn={Boolean(user)}
          emptyState={
            <EmptyState
              title={`„${topic.name}“ პირველ ტექსტს ელოდება`}
              action={
                <ButtonLink href="/write" prefetch={false}>
                  <PenLine />
                  დაწერე შენ
                </ButtonLink>
              }
            />
          }
        />
      </div>

      {feed.posts.length > 0 ? (
        <div className="mt-6">
          <Pagination basePath={`/topic/${slug}`} page={page} hasMore={feed.hasMore} />
        </div>
      ) : null}

      {related.length > 0 ? (
        <section aria-labelledby="other-topics" className="mt-20 border-t border-line pt-14 text-center">
          <h2 id="other-topics" className="headline text-[1.6rem] text-ink sm:text-[1.75rem]">
            სხვა თემები
          </h2>
          <TopicPills topics={related} className="mt-6 justify-center" />
        </section>
      ) : null}
    </main>
  );
}
