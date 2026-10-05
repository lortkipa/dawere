"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { avatarUrl } from "@/lib/user-view";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { FollowButton, useFollow } from "./follow-button";
import { FollowedIcon } from "./followed-icon";
import { ReportMenu } from "./report";

type ProfileUser = {
  id: string;
  handle: string;
  name: string;
  bio: string | null;
  avatar: string | null;
  favoritesPublic: boolean;
};

export type ProfileTab = "posts" | "favorites";

export function Profile({
  user,
  tab,
  posts,
  followers: storedFollowers,
  followed: storedFollowed,
  isOwner,
  signedIn,
}: {
  user: ProfileUser;
  tab: ProfileTab;
  // The open tab's list, which loads on its own (see ProfilePosts and ProfileFavorites).
  posts: ReactNode;
  followers: number;
  followed: boolean;
  isOwner: boolean;
  signedIn: boolean;
}) {
  const [followed, toggleFollow] = useFollow(user.id, storedFollowed);
  // Moves with the button right away instead of waiting for the refresh.
  const followers = storedFollowers + Number(followed) - Number(storedFollowed);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5">
          <Avatar src={avatarUrl(user.avatar)} className="size-16 sm:size-20" />
          <div className="min-w-0 flex-1 sm:pt-1">
            {/* One line: a long name ends in "…" and the subscribed icon stays visible after it. */}
            <div className="flex min-w-0 items-center gap-2">
              <h1 title={user.name} className="truncate text-xl font-extrabold leading-tight text-ink">
                {user.name}
              </h1>
              {followed && <FollowedIcon className="flex shrink-0" />}
            </div>
            {user.bio && <p className="mt-1.5 whitespace-pre-line break-words text-muted">{user.bio}</p>}
            <p className="mt-2 text-sm text-muted">
              <span className="font-medium text-ink">{followers}</span> გამომწერი
            </p>
          </div>
        </div>

        {isOwner ? (
          <Button href="/write" className="w-full gap-2 sm:w-auto">
            <PenIcon />
            დაწერე
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <FollowButton
              signedIn={signedIn}
              followed={followed}
              onToggle={toggleFollow}
              className="min-w-0 flex-1 sm:w-auto sm:min-w-32 sm:flex-none"
            />
            {signedIn && <ReportMenu kind="user" id={user.id} label="მომხმარებელზე ჩივილი" className="-mr-2 shrink-0" />}
          </div>
        )}
      </section>

      <section className="mt-10">
        <nav aria-label="პროფილი" className="flex gap-6 border-b border-line">
          <Tab href={`/@${user.handle}`} active={tab === "posts"}>
            ბლოგები
          </Tab>
          <Tab href={`/@${user.handle}?tab=favorites`} active={tab === "favorites"}>
            რჩეულები
            {/* Only the owner reaches here with private favorites; others see the locked card. */}
            {isOwner && !user.favoritesPublic && <LockIcon />}
          </Tab>
        </nav>
        {posts}
      </section>
    </div>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`-mb-px flex items-center gap-1.5 border-b-2 pb-3 font-semibold transition-colors ${
        active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="მხოლოდ შენ ხედავ"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}
