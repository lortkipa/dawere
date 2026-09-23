import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { after } from 'next/server';
import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { Hash } from 'lucide-react';
import { db } from '@/db';
import { topics } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { featuredTopics, topicFeed } from '@/lib/feed';
import { SIGNAL, isFollowingTopic, recordTopicSignal } from '@/lib/interests';
import { PostCardList } from '@/components/post-card';
import { Pagination } from '@/components/feed-tabs';
import { TopicFollowButton } from '@/components/engage-buttons';
import { ButtonLink, EmptyState, SectionHeading } from '@/components/ui';
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
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
      <header className="mb-4 border-b border-line pb-8">
        <Link href="/search" className="text-[13px] font-medium text-subtle transition-colors hover:text-ink">
          თემები
        </Link>
        <h1 className="mt-2 text-3xl leading-tight font-bold tracking-tight text-ink sm:text-4xl">{topic.name}</h1>
        {topic.description ? (
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">{topic.description}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
          <TopicFollowButton topicId={topic.id} initialFollowing={following} signedIn={Boolean(user)} />
          {topic.postCount > 0 ? (
            <span className="text-[13px] text-subtle">{formatCount(topic.postCount)} სტატია</span>
          ) : null}
        </div>
      </header>

      <PostCardList
        posts={feed.posts}
        signedIn={Boolean(user)}
        emptyState={
          <EmptyState
            className="mt-6"
            icon={<Hash />}
            title={`„${topic.name}“ პირველ ტექსტს ელოდება`}
            action={
              <ButtonLink href="/write" prefetch={false}>
                დაწერე შენ
              </ButtonLink>
            }
          />
        }
      />

      {feed.posts.length > 0 ? (
        <div className="mt-6">
          <Pagination basePath={`/topic/${slug}`} page={page} hasMore={feed.hasMore} />
        </div>
      ) : null}

      {related.length > 0 ? (
        <section className="mt-16 border-t border-line pt-10">
          <SectionHeading>სხვა თემები</SectionHeading>
          <div className="flex flex-wrap gap-1.5">
            {related.map((t) => (
              <Link
                key={t.id}
                href={`/topic/${t.slug}`}
                className="inline-flex items-center rounded-md bg-sunken px-2.5 py-1 text-[13px] font-medium text-muted transition-colors hover:bg-hover hover:text-ink"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
