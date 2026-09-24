import Link from 'next/link';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui';
import { BookmarkButton, CommentCountLink, LikeButton } from '@/components/engage-buttons';
import type { PostCard as PostCardData } from '@/lib/posts';
import { cn, timeAgo } from '@/lib/utils';

function Byline({ post, className }: { post: PostCardData; className?: string }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2 text-[13px]', className)}>
      <Link
        href={`/u/${post.author.username}`}
        className="flex min-w-0 items-center gap-2 font-medium text-ink transition-colors hover:text-muted"
      >
        <Avatar name={post.author.name} src={post.author.avatarUrl} size="xs" className="size-5 text-[9px]" />
        <span className="truncate">{post.author.name}</span>
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

/** A post's own cover image. Posts without one simply have none — no filler art. */
function Cover({ src, className }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" className={cn('border border-line object-cover', className)} />
  );
}

/** The feed's row: byline, headline, preview, meta; a thumbnail when there is a cover. */
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
  const topic = post.topics[0];
  return (
    <article className={cn('group border-b border-line py-7 first:pt-2 last:border-b-0', className)}>
      <Byline post={post} />

      <div className="mt-3 flex gap-4 sm:gap-6">
        <Link href={href} className="min-w-0 flex-1">
          <h2 className="font-serif text-[1.2rem] leading-snug font-semibold tracking-[-0.015em] text-pretty text-ink decoration-line-strong decoration-1 underline-offset-[5px] group-hover:underline sm:text-[1.35rem]">
            {post.title || 'უსათაურო'}
          </h2>
          <p className={cn('mt-2 text-[15px] leading-relaxed text-muted', excerpt ? 'line-clamp-3' : 'line-clamp-2')}>
            {excerpt ?? post.preview}
          </p>
        </Link>

        {post.coverImageUrl ? (
          <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden>
            <Cover src={post.coverImageUrl} className="size-18 rounded-xl sm:h-24 sm:w-36" />
          </Link>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[13px] text-subtle">
        {topic ? (
          <>
            <Link
              href={`/topic/${topic.slug}`}
              className="truncate rounded-full bg-sunken px-2.5 py-0.5 font-medium text-muted transition-colors hover:bg-hover hover:text-ink"
            >
              {topic.name}
            </Link>
            <span aria-hidden>·</span>
          </>
        ) : null}
        <span className="shrink-0">{post.readingMinutes} წთ</span>
        <div className="-mr-2.5 ml-auto flex shrink-0 items-center">
          <LikeButton postId={post.id} initialLiked={post.liked} initialCount={post.likeCount} signedIn={signedIn} />
          <CommentCountLink href={`/p/${post.slug}#comments`} count={post.commentCount} />
          <BookmarkButton postId={post.id} initialSaved={post.bookmarked} signedIn={signedIn} />
        </div>
      </div>
    </article>
  );
}

/** A tile for grids (related posts). No engagement buttons. */
export function CompactPostCard({ post, className }: { post: PostCardData; className?: string }) {
  const href = `/p/${post.slug}`;
  return (
    <article className={cn('group flex flex-col', className)}>
      {post.coverImageUrl ? (
        <Link href={href} className="mb-4 block" tabIndex={-1} aria-hidden>
          <Cover src={post.coverImageUrl} className="aspect-[16/9] w-full rounded-xl" />
        </Link>
      ) : null}
      <div className="flex items-center gap-2 text-[12px] text-subtle">
        {post.topics[0] ? <span className="font-medium text-muted">{post.topics[0].name}</span> : null}
        {post.topics[0] ? <span aria-hidden>·</span> : null}
        <span>{post.readingMinutes} წთ</span>
      </div>
      <Link href={href} className="mt-1.5 block">
        <h3 className="line-clamp-2 font-serif text-[1.125rem] leading-snug font-semibold tracking-[-0.015em] text-ink decoration-line-strong decoration-1 underline-offset-[5px] group-hover:underline">
          {post.title || 'უსათაურო'}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{post.preview}</p>
      </Link>
      <Link
        href={`/u/${post.author.username}`}
        className="mt-auto flex w-fit items-center gap-2 pt-4 text-[13px] font-medium text-ink transition-colors hover:text-muted"
      >
        <Avatar name={post.author.name} src={post.author.avatarUrl} size="xs" className="size-5 text-[9px]" />
        {post.author.name}
      </Link>
    </article>
  );
}

export function PostCardList({
  posts,
  signedIn,
  emptyState,
}: {
  posts: PostCardData[];
  signedIn: boolean;
  emptyState?: ReactNode;
}) {
  if (posts.length === 0) return <>{emptyState}</>;
  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} signedIn={signedIn} />
      ))}
    </div>
  );
}
