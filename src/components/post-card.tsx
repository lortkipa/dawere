import Link from 'next/link';
import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { PostCover } from '@/components/topic-art';
import { BookmarkButton, CommentCountLink, LikeButton } from '@/components/engage-buttons';
import type { PostCard as PostCardData } from '@/lib/posts';
import { cn, timeAgo } from '@/lib/utils';

function Byline({ post, className }: { post: PostCardData; className?: string }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2 text-[13px] text-muted', className)}>
      <Link
        href={`/u/${post.author.username}`}
        className="flex min-w-0 items-center gap-2 transition-colors hover:text-ink"
      >
        <Avatar name={post.author.name} src={post.author.avatarUrl} size="xs" />
        <span className="truncate font-medium">{post.author.name}</span>
      </Link>
      <span className="text-subtle" aria-hidden>
        ·
      </span>
      <time dateTime={post.publishedAt?.toISOString()} className="shrink-0 text-subtle">
        {timeAgo(post.publishedAt)}
      </time>
    </div>
  );
}

function TopicLabel({ topic }: { topic: PostCardData['topics'][number] | undefined }) {
  if (!topic) return null;
  return (
    <Link
      href={`/topic/${topic.slug}`}
      className="relative z-10 rounded-full bg-sunken px-2.5 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-hover hover:text-ink"
    >
      {topic.name}
    </Link>
  );
}

function ReadTime({ minutes }: { minutes: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[13px] text-subtle">
      <Clock className="size-3.5" aria-hidden />
      {minutes} წთ
    </span>
  );
}

function Actions({ post, signedIn }: { post: PostCardData; signedIn: boolean }) {
  return (
    <div className="-mr-2 flex items-center gap-0.5">
      <LikeButton postId={post.id} initialLiked={post.liked} initialCount={post.likeCount} signedIn={signedIn} />
      <CommentCountLink href={`/p/${post.slug}#comments`} count={post.commentCount} />
      <BookmarkButton postId={post.id} initialSaved={post.bookmarked} signedIn={signedIn} />
    </div>
  );
}

/** The feed's row: byline, headline, preview, and a cover on the right. */
export function PostCard({
  post,
  signedIn,
  href = `/p/${post.slug}`,
  excerpt,
  className,
}: {
  post: PostCardData;
  signedIn: boolean;
  href?: string;
  /** Replaces the stored preview — search passes the highlighted match. */
  excerpt?: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn('group border-b border-line py-7 first:pt-1 last:border-b-0', className)}>
      <Byline post={post} />

      <div className="mt-3 flex gap-5 sm:gap-8">
        <Link href={href} className="min-w-0 flex-1">
          <h2 className="font-serif text-[1.2rem] leading-snug font-bold text-ink transition-colors group-hover:text-accent sm:text-[1.4rem]">
            {post.title || 'უსათაურო'}
          </h2>
          <p
            className={cn(
              'mt-2 text-[15px] leading-relaxed text-muted',
              excerpt ? 'line-clamp-3' : 'line-clamp-2',
            )}
          >
            {excerpt ?? post.preview}
          </p>
        </Link>

        <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden>
          <PostCover
            src={post.coverImageUrl}
            topicSlug={post.topics[0]?.slug}
            glyph="sm"
            className="size-20 rounded-xl border border-line/60 transition-transform duration-300 group-hover:scale-[1.02] sm:h-28 sm:w-40"
          />
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <TopicLabel topic={post.topics[0]} />
        <ReadTime minutes={post.readingMinutes} />
        <div className="ml-auto">
          <Actions post={post} signedIn={signedIn} />
        </div>
      </div>
    </article>
  );
}

/** The lead story: a wide cover, then a larger headline. */
export function FeaturedPostCard({ post, signedIn }: { post: PostCardData; signedIn: boolean }) {
  const href = `/p/${post.slug}`;
  return (
    <article className="group mb-4 border-b border-line pb-8">
      <Link href={href} className="block overflow-hidden rounded-2xl border border-line/60" tabIndex={-1} aria-hidden>
        <PostCover
          src={post.coverImageUrl}
          topicSlug={post.topics[0]?.slug}
          glyph="lg"
          className="aspect-[2/1] w-full transition-transform duration-500 group-hover:scale-[1.015]"
        />
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <TopicLabel topic={post.topics[0]} />
        <ReadTime minutes={post.readingMinutes} />
      </div>

      <Link href={href} className="mt-3 block">
        <h2 className="font-serif text-[1.65rem] leading-tight font-bold text-ink transition-colors group-hover:text-accent sm:text-[2rem]">
          {post.title || 'უსათაურო'}
        </h2>
        <p className="mt-3 line-clamp-3 text-base leading-relaxed text-muted sm:text-[17px]">{post.preview}</p>
      </Link>

      <div className="mt-5 flex items-center justify-between gap-4">
        <Byline post={post} />
        <Actions post={post} signedIn={signedIn} />
      </div>
    </article>
  );
}

/** A tile for grids: landing page, related posts. No engagement buttons. */
export function CompactPostCard({ post, className }: { post: PostCardData; className?: string }) {
  const href = `/p/${post.slug}`;
  return (
    <article className={cn('group flex flex-col', className)}>
      <Link href={href} className="block overflow-hidden rounded-2xl border border-line/60" tabIndex={-1} aria-hidden>
        <PostCover
          src={post.coverImageUrl}
          topicSlug={post.topics[0]?.slug}
          className="aspect-[16/10] w-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </Link>
      <div className="mt-4 flex items-center gap-2 text-[12px] font-medium text-subtle">
        {post.topics[0] ? <span className="text-accent">{post.topics[0].name}</span> : null}
        {post.topics[0] ? <span aria-hidden>·</span> : null}
        <span>{post.readingMinutes} წთ</span>
      </div>
      <Link href={href} className="mt-1.5 block">
        <h3 className="line-clamp-2 font-serif text-lg leading-snug font-bold text-ink transition-colors group-hover:text-accent">
          {post.title || 'უსათაურო'}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{post.preview}</p>
      </Link>
      <Link
        href={`/u/${post.author.username}`}
        className="mt-4 flex w-fit items-center gap-2 text-[13px] text-muted transition-colors hover:text-ink"
      >
        <Avatar name={post.author.name} src={post.author.avatarUrl} size="xs" />
        <span className="font-medium">{post.author.name}</span>
      </Link>
    </article>
  );
}

export function PostCardList({
  posts,
  signedIn,
  emptyState,
  featureFirst = false,
}: {
  posts: PostCardData[];
  signedIn: boolean;
  emptyState?: ReactNode;
  /** Gives the first post the wide lead treatment. */
  featureFirst?: boolean;
}) {
  if (posts.length === 0) return <>{emptyState}</>;
  const [first, ...rest] = posts;
  return (
    <div>
      {featureFirst ? <FeaturedPostCard post={first} signedIn={signedIn} /> : null}
      {(featureFirst ? rest : posts).map((post) => (
        <PostCard key={post.id} post={post} signedIn={signedIn} />
      ))}
    </div>
  );
}
