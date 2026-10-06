"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import { setFollow } from "@/app/follow/actions";
import type { Page } from "@/lib/feed";
import type { AuthorResult } from "@/lib/search";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { FollowButton } from "./follow-button";
import { FollowedIcon } from "./followed-icon";
import { Bone } from "./skeleton";
import { useWindowedList } from "./use-windowed-list";

// Authors per page, as feedPageSize in lib/feed.ts.
const step = 25;

// Authors found by search, with a follow button on each. Follows change on screen at once and are
// saved in the background, as on post cards.
export function AuthorList({
  first,
  endpoint,
  viewerId,
  empty: emptyState,
}: {
  first: Page<AuthorResult>;
  endpoint: string;
  viewerId?: string;
  empty: ReactNode;
}) {
  const { groups, above, below, empty, after, done, failed, retry, list, groupRef, bottom } = useWindowedList(
    first,
    endpoint,
    step,
  );
  const [follows, setFollows] = useState<Map<string, boolean>>(() => new Map());

  const toggleFollow = (authorId: string, followed: boolean) => {
    const update = (value: boolean) => setFollows((current) => new Map(current).set(authorId, value));
    update(!followed);
    setFollow(authorId, !followed).catch(() => update(followed));
  };

  if (empty && done) return emptyState;

  return (
    <div className="[overflow-anchor:none]">
      <div ref={list}>
        <div style={{ height: above }} />
        {groups.map((group) => (
          <div key={group.index} ref={groupRef} data-group={group.index}>
            {group.items.map((author) => {
              const followed = follows.get(author.id) ?? author.followed;
              return (
                <div key={author.id} className="animate-rise flex items-center gap-4 border-b border-line py-4">
                  <Link href={author.href} className="group flex min-w-0 flex-1 items-center gap-3">
                    <Avatar src={author.avatar} className="size-11" />
                    <span className="min-w-0 flex-1">
                      {/* One line: a long name ends in "…" and the followed icon stays visible after it. */}
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-semibold text-ink group-hover:underline">{author.name}</span>
                        {followed && <FollowedIcon className="flex shrink-0" />}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        @{author.handle}
                        {author.bio && ` · ${author.bio}`}
                      </span>
                    </span>
                  </Link>
                  {author.id !== viewerId && (
                    <FollowButton
                      size="sm"
                      signedIn={Boolean(viewerId)}
                      followed={followed}
                      onToggle={() => toggleFollow(author.id, followed)}
                      className="shrink-0"
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ height: below }} />
      </div>

      <div ref={bottom} />
      {after && <AuthorSkeleton count={3} />}
      {failed && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-muted">ვერ ჩაიტვირთა</p>
          <Button variant="outline" size="sm" onClick={retry}>
            თავიდან ცდა
          </Button>
        </div>
      )}
    </div>
  );
}

export function AuthorSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div role="status">
      <span className="sr-only">იტვირთება</span>
      <div aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="flex items-center gap-3 border-b border-line py-4">
            <Bone className="size-11 rounded-full" />
            <div className="flex-1">
              <Bone className="h-4 w-36" />
              <Bone className="mt-2 h-3.5 w-52" />
            </div>
            <Bone className="h-8 w-24 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
