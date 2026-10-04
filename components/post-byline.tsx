"use client";

import Link from "next/link";
import { Avatar } from "./avatar";
import { FollowButton, useFollow } from "./follow-button";
import { FollowedIcon } from "./followed-icon";

// Name over date, so on a phone the name gets the whole width next to the follow button.
export function PostByline({
  href,
  name,
  avatar,
  date,
  dateTime,
  authorId,
  followed: initialFollowed,
  canFollow,
  signedIn,
}: {
  href: string;
  name: string;
  avatar?: string;
  date: string;
  dateTime: string;
  authorId: string;
  followed: boolean;
  canFollow: boolean;
  signedIn: boolean;
}) {
  const [followed, toggleFollow] = useFollow(authorId, initialFollowed);

  return (
    <div className="mt-6 flex items-center gap-3 border-b border-line pb-6">
      <Link href={href} className="shrink-0 rounded-full">
        <Avatar src={avatar} className="size-10 sm:size-11" />
      </Link>
      <div className="min-w-0 flex-1">
        {/* One line: a long name ends in "…" and the subscribed icon stays visible after it. */}
        <div className="flex min-w-0 items-center gap-1.5">
          <Link href={href} className="truncate font-medium leading-snug text-ink hover:underline">
            {name}
          </Link>
          {followed && <FollowedIcon className="flex shrink-0" />}
        </div>
        <time dateTime={dateTime} className="block text-sm text-muted">
          {date}
        </time>
      </div>
      {canFollow && (
        <FollowButton
          signedIn={signedIn}
          followed={followed}
          onToggle={toggleFollow}
          size="sm"
          className="shrink-0"
        />
      )}
    </div>
  );
}
