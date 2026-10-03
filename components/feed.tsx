"use client";

import { useCallback, useRef, useState } from "react";
import type { FeedPost } from "@/lib/fake-feed";
import { Avatar } from "./avatar";
import { Icon, MenuItem, menuClass, useDismiss } from "./menu";

// Likes, saves and follows live in client state only until there is a backend for them.
export function Feed({ posts }: { posts: FeedPost[] }) {
  const [followed, setFollowed] = useState<Set<string>>(() => new Set());

  const toggleFollow = (author: string) =>
    setFollowed((current) => {
      const next = new Set(current);
      if (next.has(author)) next.delete(author);
      else next.add(author);
      return next;
    });

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-4 sm:px-6">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          followed={followed.has(post.author)}
          onToggleFollow={() => toggleFollow(post.author)}
        />
      ))}
    </div>
  );
}

function PostCard({
  post,
  followed,
  onToggleFollow,
}: {
  post: FeedPost;
  followed: boolean;
  onToggleFollow: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <article className="border-b border-line py-6">
      <div className="flex items-center gap-2 text-sm">
        <Avatar className="size-5" />
        <span className="font-medium text-ink">{post.author}</span>
        {followed && (
          <span title="გამოწერილი" className="flex text-blue-500">
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" role="img" aria-label="გამოწერილი">
              <circle cx="9" cy="7.5" r="4" />
              <path d="M1.5 20.5a7.5 7.5 0 0 1 15 0 .5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5z" />
              <path
                d="m16 11.5 2.25 2.25L22.5 9.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
        <span className="text-muted">· {post.date}</span>
        <div className="-my-2 -mr-2 ml-auto">
          <PostMenu followed={followed} onToggleFollow={onToggleFollow} />
        </div>
      </div>

      <div className="mt-3 flex gap-6 sm:gap-10">
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-3 text-xl font-extrabold leading-snug text-ink sm:text-2xl">{post.title}</h2>
          <p className="mt-2 hidden text-muted sm:line-clamp-1">{post.description}</p>

          <div className="-ml-2 mt-4 flex items-center gap-1">
            <ActionButton
              label="მოწონება"
              pressed={liked}
              count={post.likes + (liked ? 1 : 0)}
              onClick={() => setLiked((value) => !value)}
            >
              <svg
                viewBox="0 0 24 24"
                className={`size-5 ${liked ? "fill-red-500 text-red-500" : "fill-none"}`}
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20.5s-8-4.6-8-10.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.9c0 6-8 10.6-8 10.6z" />
              </svg>
            </ActionButton>
            {/* Comments aren't built yet; the button does nothing. */}
            <ActionButton label="კომენტარები" count={post.comments} onClick={() => {}}>
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
            </ActionButton>
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
          <div
            className="h-16 w-24 shrink-0 rounded-md sm:h-28 sm:w-40"
            style={{ background: post.cover }}
            aria-hidden="true"
          />
        )}
      </div>
    </article>
  );
}

// Exact up to 9999 so a like visibly adds one, then compact („12K“). No toLocaleString:
// server and browser ICU disagree on the separator, which breaks hydration.
function formatCount(value: number) {
  if (value < 10_000) return String(value);
  return `${Number((value / 1000).toFixed(1))}K`;
}

function ActionButton({
  label,
  pressed,
  count,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={count ? `${label}: ${count}` : label}
      aria-pressed={pressed}
      onClick={onClick}
      className="flex h-9 min-w-9 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 text-muted transition-colors hover:bg-surface hover:text-ink"
    >
      {children}
      {count ? <span className="text-sm tabular-nums">{formatCount(count)}</span> : null}
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
