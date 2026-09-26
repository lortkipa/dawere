import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { suggestedAuthors, trendingInTopics } from '@/lib/feed';
import { topInterests } from '@/lib/interests';
import { Avatar, SectionHeading, TopicPills } from '@/components/ui';
import { FollowButton } from '@/components/engage-buttons';

/**
 * Right-hand rail, built from the reader's topics: what is moving in them, who
 * writes about them, and the topics themselves with a way to change them.
 * `exclude` is the feed page beside the rail, which it should not repeat.
 */
export async function Sidebar({ userId, exclude }: { userId: string; exclude: string[] }) {
  const [trending, authors, interests] = await Promise.all([
    trendingInTopics(userId, 4, exclude),
    suggestedAuthors(userId, 3),
    topInterests(userId, 8),
  ]);

  return (
    <aside className="space-y-11">
      {trending.length > 0 ? (
        <section>
          <SectionHeading>პოპულარული შენს თემებში</SectionHeading>
          <ol className="space-y-4">
            {trending.map((post, index) => (
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
                  <p className="truncate text-[12px] text-subtle">{author.topics.join(' · ')}</p>
                </div>
                <FollowButton authorId={author.id} initialFollowing={false} signedIn compact />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <SectionHeading
          action={
            <Link
              href="/settings#interests"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-muted hover:text-ink [&>svg]:size-3"
            >
              <Pencil />
              რედაქტირება
            </Link>
          }
        >
          შენი თემები
        </SectionHeading>
        {interests.length > 0 ? (
          <>
            <TopicPills topics={interests} size="sm" />
            <p className="mt-3 text-[12px] leading-relaxed text-subtle">„შენთვის“ ნაკადი ამ თემებით ლაგდება.</p>
          </>
        ) : (
          <p className="text-[13px] leading-relaxed text-muted">აირჩიე თემები და „შენთვის“ ნაკადი მათ მოერგება.</p>
        )}
      </section>
    </aside>
  );
}
