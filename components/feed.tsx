"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { setFollow } from "@/app/follow/actions";
import { setPostLike } from "@/app/likes/actions";
import type { FeedPost, Page } from "@/lib/feed";
import { formatCount } from "@/lib/format-count";
import { imageUrl } from "@/lib/user-view";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { EmptyIllustration } from "./empty-illustration";
import { FollowedIcon } from "./followed-icon";
import { actionClass, LikeButton } from "./like-button";
import { Icon, MenuItem, menuClass, useDismiss } from "./menu";
import { FeedSkeleton } from "./skeleton";
import { useInfiniteList } from "./use-infinite-list";
import { useSeen } from "./use-seen";

const feedClass = "mx-auto max-w-2xl px-4 pb-16 pt-4 sm:px-6";

// Shown while the first page loads.
export function FeedLoading() {
  return (
    <div className={feedClass}>
      <FeedSkeleton />
    </div>
  );
}

// Likes and follows change on screen at once and are saved in the background. They live in this
// component rather than in useOptimistic: pages fetched while scrolling never get fresh server
// props to fall back to. Saves stay client-only until there is a backend for them.
export function Feed({ first }: { first: Page<FeedPost> }) {
  const { items, done, loading, failed, retry, sentinel } = useInfiniteList(first, "/api/feed");
  const seenRef = useSeen();
  // Follows changed during this visit, by author id. They apply to every card by that author.
  const [follows, setFollows] = useState<Map<string, boolean>>(() => new Map());

  const toggleFollow = (authorId: string, followed: boolean) => {
    const update = (value: boolean) => setFollows((current) => new Map(current).set(authorId, value));
    update(!followed);
    setFollow(authorId, !followed).catch(() => update(followed));
  };

  if (items.length === 0 && done) {
    return (
      <div className={feedClass}>
        <div className="mt-6 flex flex-col items-center rounded-xl border border-line px-6 py-12 text-center sm:py-16">
          <EmptyIllustration className="w-44 sm:w-52" />
          <h2 className="mt-6 text-xl font-semibold text-ink sm:text-2xl">ჯერ ბლოგები არ არის</h2>
          <p className="mt-2 text-muted">როცა ვინმე რამეს გამოაქვეყნებს, აქ გამოჩნდება.</p>
          <Button href="/write" variant="outline" className="mt-6">
            დაწერე პირველი ბლოგი
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={feedClass}>
      {items.map((post) => {
        const followed = follows.get(post.author.id) ?? post.followed;
        return (
          <PostCard
            key={post.id}
            post={post}
            seenRef={seenRef}
            followed={followed}
            onToggleFollow={() => toggleFollow(post.author.id, followed)}
          />
        );
      })}

      <div ref={sentinel} />
      {loading && <FeedSkeleton count={2} />}
      {failed && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-muted">ვერ ჩაიტვირთა</p>
          <Button variant="outline" size="sm" onClick={retry}>
            თავიდან ცდა
          </Button>
        </div>
      )}
      {done && <p className="py-10 text-center text-sm text-muted">სხვა ბლოგები ჯერ არ არის</p>}
    </div>
  );
}

function PostCard({
  post,
  followed,
  onToggleFollow,
  seenRef,
}: {
  post: FeedPost;
  followed: boolean;
  onToggleFollow: () => void;
  seenRef: (element: HTMLElement | null) => void;
}) {
  const [like, setLike] = useState({ liked: post.liked, count: post.likes });
  const [saved, setSaved] = useState(false);
  const profile = `/@${post.author.handle}`;

  const toggleLike = () => {
    const before = like;
    setLike({ liked: !before.liked, count: before.count + (before.liked ? -1 : 1) });
    setPostLike(post.id, !before.liked).catch(() => setLike(before));
  };

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
        <div className="-my-2 -mr-2 ml-auto">
          <PostMenu followed={followed} onToggleFollow={onToggleFollow} />
        </div>
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
            <LikeButton signedIn liked={like.liked} count={like.count} onToggle={toggleLike} />
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
            <ActionButton label="შენახვა" pressed={saved} onClick={() => setSaved((value) => !value)}>
              <svg
                viewBox="0 0 24 24"
                className={`size-5 ${saved ? "fill-yellow-400 text-yellow-500" : "fill-none"}`}
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 3.5h12a.5.5 0 0 1 .5.5v16.5L12 16l-6.5 4.5V4a.5.5 0 0 1 .5-.5z" />
              </svg>
            </ActionButton>
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

function ActionButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" aria-label={label} aria-pressed={pressed} onClick={onClick} className={`${actionClass} h-9`}>
      {children}
    </button>
  );
}

function PostMenu({ followed, onToggleFollow }: { followed: boolean; onToggleFollow: () => void }) {
  const [open, setOpen] = useState(false);
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
          {/* Muting and reporting aren't built yet; these only close the menu. */}
          <MenuItem icon={<MuteIcon />} onClick={close}>
            ავტორის დადუმება
          </MenuItem>
          <MenuItem icon={<FlagIcon />} danger onClick={close}>
            ბლოგზე ჩივილი
          </MenuItem>
        </div>
      )}
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

function FlagIcon() {
  return (
    <Icon>
      <path d="M4 22V4a1 1 0 0 1 1-1h13l-2.5 5L18 13H5" />
    </Icon>
  );
}
