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
import { topicEmoji } from '@/lib/topic-art';
import { PostCardList } from '@/components/post-card';
import { Pagination } from '@/components/feed-tabs';
import { TopicFollowButton } from '@/components/engage-buttons';
import { TopicArt } from '@/components/topic-art';
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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-12 sm:px-6 sm:pt-6">
      <header className="relative mb-10 overflow-hidden rounded-3xl border border-line/60">
        <TopicArt slug={topic.slug} className="absolute inset-0" glyph={false} />
        <div className="relative flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-9">
          <div className="min-w-0">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-raised/80 text-4xl shadow-soft backdrop-blur" aria-hidden>
              {topicEmoji(topic.slug)}
            </span>
            <h1 className="mt-5 font-serif text-[2rem] leading-tight font-bold tracking-tight text-ink sm:text-[2.5rem]">
              {topic.name}
            </h1>
            {topic.description ? (
              <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-ink/75">{topic.description}</p>
            ) : null}
            {topic.postCount > 0 ? (
              <p className="mt-3 text-[13px] font-medium text-ink/60">{formatCount(topic.postCount)} სტატია</p>
            ) : null}
          </div>
          <TopicFollowButton topicId={topic.id} initialFollowing={following} signedIn={Boolean(user)} />
        </div>
      </header>

      <PostCardList
        posts={feed.posts}
        signedIn={Boolean(user)}
        emptyState={
          <EmptyState
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
        <div className="mt-8">
          <Pagination basePath={`/topic/${slug}`} page={page} hasMore={feed.hasMore} />
        </div>
      ) : null}

      {related.length > 0 ? (
        <section className="mt-16 border-t border-line pt-10">
          <SectionHeading>სხვა თემები</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {related.map((t) => (
              <Link
                key={t.id}
                href={`/topic/${t.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-3.5 py-1.5 text-[13px] font-medium text-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                <span aria-hidden>{topicEmoji(t.slug)}</span>
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
