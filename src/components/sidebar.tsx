import Link from 'next/link';
import { featuredTopics, publishedPostCount, suggestedAuthors, trendingFeed } from '@/lib/feed';
import { Avatar, SectionHeading, TopicPills } from '@/components/ui';
import { FollowButton } from '@/components/engage-buttons';

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
    <aside className="space-y-11">
      {published >= TRENDING_MIN_POSTS && trending.posts.length > 0 ? (
        <section>
          <SectionHeading>ახლა კითხულობენ</SectionHeading>
          <ol className="space-y-4">
            {trending.posts.map((post, index) => (
              <li key={post.id} className="group flex gap-3">
                <span className="w-5 shrink-0 font-serif text-[15px] leading-snug font-semibold text-subtle tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <Link
                    href={`/p/${post.slug}`}
                    className="line-clamp-2 font-serif text-[15px] leading-snug font-semibold text-ink decoration-line-strong underline-offset-4 group-hover:underline"
                  >
                    {post.title}
                  </Link>
                  <Link
                    href={`/u/${post.author.username}`}
                    className="mt-1 block truncate text-[12px] text-subtle hover:text-ink"
                  >
                    {post.author.name}
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
              <li key={author.id} className="flex items-center gap-3">
                <Link href={`/u/${author.username}`} className="shrink-0">
                  <Avatar name={author.name} src={author.avatar_url} size="sm" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${author.username}`}
                    className="block truncate text-[13px] font-medium text-ink hover:underline"
                  >
                    {author.name}
                  </Link>
                  <p className="truncate text-[12px] text-subtle">{author.bio || `${author.post_count} სტატია`}</p>
                </div>
                <FollowButton authorId={author.id} initialFollowing={false} signedIn={Boolean(userId)} compact />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {topics.length > 0 ? (
        <section>
          <SectionHeading
            action={
              <Link href="/search" className="text-[12px] font-medium text-muted hover:text-ink">
                ყველა
              </Link>
            }
          >
            თემები
          </SectionHeading>
          <TopicPills topics={topics} size="sm" />
        </section>
      ) : null}
    </aside>
  );
}
