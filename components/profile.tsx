"use client";

import type { ReactNode } from "react";
import { avatarUrl } from "@/lib/user-view";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { FollowButton, useFollow } from "./follow-button";
import { FollowedIcon } from "./followed-icon";

type ProfileUser = { id: string; name: string; bio: string | null; avatar: string | null };

export function Profile({
  user,
  posts,
  followers: storedFollowers,
  followed: storedFollowed,
  isOwner,
  signedIn,
}: {
  user: ProfileUser;
  // The post list, which loads on its own (see ProfilePosts).
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
          <FollowButton
            signedIn={signedIn}
            followed={followed}
            onToggle={toggleFollow}
            className="w-full sm:w-auto sm:min-w-32"
          />
        )}
      </section>

      <section className="mt-10">
        <h2 className="border-b border-line pb-3 font-semibold text-ink">ბლოგები</h2>
        {posts}
      </section>
    </div>
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
