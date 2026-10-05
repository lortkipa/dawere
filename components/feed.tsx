"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { setPostFavorite } from "@/app/favorites/actions";
import { setFollow } from "@/app/follow/actions";
import { setPostLike } from "@/app/likes/actions";
import type { FeedPost, Page } from "@/lib/feed";
import { formatCount } from "@/lib/format-count";
import { imageUrl } from "@/lib/user-view";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { EmptyIllustration } from "./empty-illustration";
import { FavoriteButton } from "./favorite-button";
import { FollowedIcon } from "./followed-icon";
import { actionClass, LikeButton } from "./like-button";
import { Icon, MenuItem, menuClass, useDismiss } from "./menu";
import { OwnPostMenu } from "./own-post-menu";
import { ReportDialog, ReportItem } from "./report";
import { FeedSkeleton } from "./skeleton";
import { useSeen } from "./use-seen";
import { useWindowedList } from "./use-windowed-list";

const feedClass = "mx-auto max-w-2xl px-4 pb-16 pt-4 sm:px-6";

// Posts per page, as feedPageSize in lib/feed.ts. Pages far from the screen leave the page.
const step = 25;

// The home feed: every post but the reader's own.
export function Feed({ first, viewerId }: { first: Page<FeedPost>; viewerId: string }) {
  return (
    <div className={feedClass}>
      <PostList
        first={first}
        endpoint="/api/feed"
        viewerId={viewerId}
        endNote="სხვა ბლოგები ჯერ არ არის"
        empty={
          <EmptyState title="ჯერ ბლოგები არ არის" text="როცა ვინმე რამეს გამოაქვეყნებს, აქ გამოჩნდება.">
            <Button href="/write" variant="outline" className="mt-6">
              დაწერე პირველი ბლოგი
            </Button>
          </EmptyState>
        }
      />
    </div>
  );
}

export function EmptyState({
  title,
  text,
  art,
  children,
}: {
  title: string;
  text: string;
  // The notebook unless something else fits better.
  art?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-xl border border-line px-6 py-12 text-center sm:py-16">
      {art ?? <EmptyIllustration className="w-44 sm:w-52" />}
      <h2 className="mt-6 text-xl font-semibold text-ink sm:text-2xl">{title}</h2>
      <p className="mt-2 text-muted">{text}</p>
      {children}
    </div>
  );
}

type Like = { liked: boolean; count: number };

// Shown while the first page loads.
export function FeedLoading() {
  return (
    <div className={feedClass}>
      <FeedSkeleton />
    </div>
  );
}

// The list of post cards on the home feed and on profiles. `viewerId` is the signed-in reader, if
// any; signed-out readers get sign-in links for likes and no menu.
//
// Likes, favorites and follows change on screen at once and are saved in the background. They
// live in this component rather than in useOptimistic: pages fetched while scrolling never get
// fresh server props to fall back to. They aren't kept in the cards either, since cards scrolled
// far enough away are taken off the page.
export function PostList({
  first,
  endpoint,
  viewerId,
  empty: emptyState,
  endNote,
}: {
  first: Page<FeedPost>;
  endpoint: string;
  viewerId?: string;
  empty: ReactNode;
  // Shown under the last post once there is nothing more to load; profiles go without one.
  endNote?: string;
}) {
  const { groups, above, below, empty, after, done, failed, retry, list, groupRef, bottom } = useWindowedList(
    first,
    endpoint,
    step,
  );
  const seenRef = useSeen();
  // Follows changed during this visit, by author id. They apply to every card by that author.
  const [follows, setFollows] = useState<Map<string, boolean>>(() => new Map());
  // Likes and favorites changed during this visit, by post id.
  const [likes, setLikes] = useState<Map<string, Like>>(() => new Map());
  const [favorites, setFavorites] = useState<Map<string, boolean>>(() => new Map());
  // The reader's own posts deleted from this list.
  const [deleted, setDeleted] = useState<Set<string>>(() => new Set());

  const toggleFollow = (authorId: string, followed: boolean) => {
    const update = (value: boolean) => setFollows((current) => new Map(current).set(authorId, value));
    update(!followed);
    setFollow(authorId, !followed).catch(() => update(followed));
  };

  const toggleLike = (postId: string, before: Like) => {
    const update = (value: Like) => setLikes((current) => new Map(current).set(postId, value));
    update({ liked: !before.liked, count: before.count + (before.liked ? -1 : 1) });
    setPostLike(postId, !before.liked).catch(() => update(before));
  };

  const toggleFavorite = (postId: string, favorited: boolean) => {
    const update = (value: boolean) => setFavorites((current) => new Map(current).set(postId, value));
    update(!favorited);
    setPostFavorite(postId, !favorited).catch(() => update(favorited));
  };

  // Also once the reader has deleted every post the list had.
  const allDeleted =
    deleted.size > 0 &&
    above === 0 &&
    below === 0 &&
    groups.every((group) => group.items.every((post) => deleted.has(post.id)));
  if ((empty || allDeleted) && done) return emptyState;

  return (
    // The browser's own scroll anchoring stays off: useWindowedList keeps the position itself.
    <div className="[overflow-anchor:none]">
      <div ref={list}>
        <div style={{ height: above }} />
        {groups.map((group) => (
          <div key={group.index} ref={groupRef} data-group={group.index}>
            {group.items.map((post) => {
              if (deleted.has(post.id)) return null;
              const followed = follows.get(post.author.id) ?? post.followed;
              const like = likes.get(post.id) ?? { liked: post.liked, count: post.likes };
              const favorited = favorites.get(post.id) ?? post.favorited;
              return (
                <PostCard
                  key={post.id}
                  post={post}
                  seenRef={seenRef}
                  signedIn={Boolean(viewerId)}
                  own={post.author.id === viewerId}
                  followed={followed}
                  onToggleFollow={() => toggleFollow(post.author.id, followed)}
                  like={like}
                  onToggleLike={() => toggleLike(post.id, like)}
                  favorited={favorited}
                  onToggleFavorite={() => toggleFavorite(post.id, favorited)}
                  onDeleted={() => setDeleted((current) => new Set(current).add(post.id))}
                />
              );
            })}
          </div>
        ))}
        <div style={{ height: below }} />
      </div>

      <div ref={bottom} />
      {after && <FeedSkeleton count={3} />}
      {failed && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-muted">ვერ ჩაიტვირთა</p>
          <Button variant="outline" size="sm" onClick={retry}>
            თავიდან ცდა
          </Button>
        </div>
      )}
      {done && endNote && <p className="py-10 text-center text-sm text-muted">{endNote}</p>}
    </div>
  );
}

function PostCard({
  post,
  signedIn,
  own,
  followed,
  onToggleFollow,
  like,
  onToggleLike,
  favorited,
  onToggleFavorite,
  onDeleted,
  seenRef,
}: {
  post: FeedPost;
  signedIn: boolean;
  // The reader's own post, whose menu edits or deletes it.
  own: boolean;
  followed: boolean;
  onToggleFollow: () => void;
  like: Like;
  onToggleLike: () => void;
  favorited: boolean;
  onToggleFavorite: () => void;
  onDeleted: () => void;
  seenRef: (element: HTMLElement | null) => void;
}) {
  const profile = `/@${post.author.handle}`;

  return (
    <article ref={seenRef} data-post-id={post.id} className="animate-rise border-b border-line py-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href={profile} className="flex min-w-0 items-center gap-2">
          <Avatar src={post.author.avatar} className="size-5" />
          <span className="truncate font-medium text-ink hover:underline">{post.author.name}</span>
        </Link>
        {followed && <FollowedIcon className="flex shrink-0" />}
        <time dateTime={post.dateTime} className="shrink-0 text-muted">
          · {post.date}
        </time>
        {signedIn && (
          <div className="-my-2 -mr-2 ml-auto">
            {own ? (
              <OwnPostMenu id={post.id} href={post.href} comments={post.comments} onDeleted={onDeleted} />
            ) : (
              <PostMenu postId={post.id} followed={followed} onToggleFollow={onToggleFollow} />
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-6 sm:gap-10">
        <div className="min-w-0 flex-1">
          <Link href={post.href} className="group block">
            <h2 className="line-clamp-3 text-xl font-extrabold leading-snug break-words text-ink group-hover:underline sm:text-2xl">
              {post.title}
            </h2>
            <p className="mt-2 hidden break-words text-muted sm:line-clamp-1">{post.description}</p>
          </Link>

          <div className="-ml-2 mt-4 flex items-center gap-1">
            <LikeButton signedIn={signedIn} liked={like.liked} count={like.count} onToggle={onToggleLike} />
            <Link
              href={`${post.href}#comments`}
              aria-label={post.comments ? `კომენტარები: ${post.comments}` : "კომენტარები"}
              className={`${actionClass} h-9`}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20.5 11.5a8.5 8 0 0 1-12.2 7.2L3.5 20l1.4-4.1a8.5 8 0 1 1 15.6-4.4z" />
              </svg>
              {post.comments > 0 && <span className="text-sm tabular-nums">{formatCount(post.comments)}</span>}
            </Link>
            <FavoriteButton signedIn={signedIn} favorited={favorited} onToggle={onToggleFavorite} />
          </div>
        </div>

        {post.cover && (
          <Link href={post.href} tabIndex={-1} aria-hidden="true" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(post.cover)}
              alt=""
              loading="lazy"
              className="h-16 w-24 rounded-md bg-surface object-cover sm:h-28 sm:w-40"
            />
          </Link>
        )}
      </div>
    </article>
  );
}

function PostMenu({
  postId,
  followed,
  onToggleFollow,
}: {
  postId: string;
  followed: boolean;
  onToggleFollow: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="მეტი"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="19" cy="12" r="1.75" />
        </svg>
      </button>

      {open && (
        <div role="menu" className={`${menuClass} w-60`}>
          <MenuItem
            icon={followed ? <UnfollowIcon /> : <FollowIcon />}
            onClick={() => {
              onToggleFollow();
              close();
            }}
          >
            {followed ? "გამოწერის გაუქმება" : "ავტორის გამოწერა"}
          </MenuItem>
          {/* Muting isn't built yet; this only closes the menu. */}
          <MenuItem icon={<MuteIcon />} onClick={close}>
            ავტორის დადუმება
          </MenuItem>
          <ReportItem
            onClick={() => {
              close();
              setReporting(true);
            }}
          >
            ბლოგზე ჩივილი
          </ReportItem>
        </div>
      )}

      {reporting && <ReportDialog kind="post" id={postId} onClose={() => setReporting(false)} />}
    </div>
  );
}

function FollowIcon() {
  return (
    <Icon>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6" />
    </Icon>
  );
}

function UnfollowIcon() {
  return (
    <Icon>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M16 11h6" />
    </Icon>
  );
}

function MuteIcon() {
  return (
    <Icon>
      <path d="M11 5 6 9H2v6h4l5 4V5zM22 9l-6 6M16 9l6 6" />
    </Icon>
  );
}

