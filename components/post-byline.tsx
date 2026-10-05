"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "./avatar";
import { FollowButton, useFollow } from "./follow-button";
import { FollowedIcon } from "./followed-icon";
import { OwnPostMenu } from "./own-post-menu";
import { ReportMenu } from "./report";

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
  own,
  reportId,
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
  // The reader wrote this post: a menu to edit or delete it takes the follow button's place.
  own?: { id: string; href: string; comments: number };
  // Set for a signed-in reader on someone else's post, which they can report.
  reportId?: string;
}) {
  const [followed, toggleFollow] = useFollow(authorId, initialFollowed);
  const router = useRouter();

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
      {reportId && <ReportMenu kind="post" id={reportId} label="ბლოგზე ჩივილი" className="-mr-2 shrink-0" />}
      {own && (
        <div className="-mr-2 shrink-0">
          <OwnPostMenu {...own} onDeleted={() => router.replace(href)} />
        </div>
      )}
    </div>
  );
}
