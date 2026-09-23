import Link from 'next/link';
import { featuredTopics, publishedPostCount, suggestedAuthors, trendingFeed } from '@/lib/feed';
import { Avatar, SectionHeading } from '@/components/ui';
import { FollowButton } from '@/components/engage-buttons';
import { topicEmoji } from '@/lib/topic-art';

/**
 * Below this many live posts a "what people are reading" list only repeats
 * the feed beside it, so it stays hidden until there is something to rank.
 */
const TRENDING_MIN_POSTS = 12;

/** Right-hand rail. Every block is independent, so one empty block is fine. */
export async function Sidebar({ userId }: { userId: string | null }) {
  const [topics, authors, trending, published] = await Promise.all([
    featuredTopics(12, { includeEmpty: true }),
    suggestedAuthors(userId, 3),
    trendingFeed(userId, 4, 0),
    publishedPostCount(),
  ]);

  return (
    <aside className="space-y-10">
      {published >= TRENDING_MIN_POSTS && trending.posts.length > 0 ? (
        <section>
          <SectionHeading>ახლა კითხულობენ</SectionHeading>
          <ol className="space-y-5">
            {trending.posts.map((post, index) => (
              <li key={post.id} className="group flex gap-3.5">
                <span className="w-8 shrink-0 font-serif text-2xl leading-none font-bold whitespace-nowrap text-line-strong tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/u/${post.author.username}`}
                    className="flex items-center gap-1.5 text-[12px] text-muted hover:text-ink"
                  >
                    <Avatar name={post.author.name} src={post.author.avatarUrl} size="xs" className="size-4 text-[7px]" />
                    <span className="truncate">{post.author.name}</span>
                  </Link>
                  <Link
                    href={`/p/${post.slug}`}
                    className="mt-1 line-clamp-2 text-[15px] leading-snug font-semibold text-ink transition-colors group-hover:text-accent"
                  >
                    {post.title}
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {authors.length > 0 ? (
        <section>
          <SectionHeading>გამოსაწერი ავტორები</SectionHeading>
          <ul className="space-y-4">
            {authors.map((author) => (
              <li key={author.id} className="flex items-start gap-3">
                <Link href={`/u/${author.username}`} className="shrink-0">
                  <Avatar name={author.name} src={author.avatar_url} size="md" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${author.username}`}
                    className="block truncate text-sm font-semibold text-ink hover:text-accent"
                  >
                    {author.name}
                  </Link>
                  <p className="line-clamp-1 text-[13px] leading-snug text-subtle">
                    {author.bio || `${author.post_count} სტატია`}
                  </p>
                </div>
                <FollowButton authorId={author.id} initialFollowing={false} signedIn={Boolean(userId)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {topics.length > 0 ? (
        <section>
          <SectionHeading
            action={
              <Link href="/search" className="text-[13px] font-medium text-accent hover:underline">
                ყველა
              </Link>
            }
          >
            თემები
          </SectionHeading>
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/topic/${topic.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                <span aria-hidden>{topicEmoji(topic.slug)}</span>
                {topic.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
}
