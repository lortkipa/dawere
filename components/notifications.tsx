"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { markSeen } from "@/app/notifications/actions";
import type { Page } from "@/lib/feed";
import type { Notification } from "@/lib/notifications";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { EmptyState } from "./feed";
import { seenEvent } from "./notification-bell";
import { NotificationSkeleton } from "./skeleton";
import { useWindowedList } from "./use-windowed-list";

// Rows per page, as notificationsPageSize in lib/notifications.ts.
const step = 20;

// Everything that happened to the reader, newest first. Opening the page marks it all seen, but
// the rows that were new keep their tint until the next visit.
export function Notifications({ first, newest }: { first: Page<Notification>; newest: string | null }) {
  const { groups, above, below, empty, after, done, failed, retry, list, groupRef, bottom } = useWindowedList(
    first,
    "/api/notifications",
    step,
  );

  useEffect(() => {
    if (!newest || !first.items.some((item) => item.unread)) return;
    markSeen(newest)
      // The bell drops to 0 at once.
      .then(() => window.dispatchEvent(new Event(seenEvent)))
      .catch(() => {});
  }, [newest, first.items]);

  if (empty && done) {
    return (
      <EmptyState
        title="შეტყობინებები ჯერ არ არის"
        text="როცა ვინმე გამოგიწერს, მოიწონებს ან გიპასუხებს, აქ გამოჩნდება."
      />
    );
  }

  return (
    <div className="mt-6 [overflow-anchor:none]">
      <div ref={list}>
        <div style={{ height: above }} />
        {groups.map((group) => (
          <div key={group.index} ref={groupRef} data-group={group.index} className="flex flex-col gap-1 pb-1">
            {group.items.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </div>
        ))}
        <div style={{ height: below }} />
      </div>

      <div ref={bottom} />
      {after && <NotificationSkeleton count={3} />}
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

function Row({ item }: { item: Notification }) {
  const others = item.count - 1;

  return (
    <Link
      href={item.href}
      className={`-mx-3 flex gap-3 rounded-xl px-3 py-3 transition-colors ${
        item.unread ? "bg-surface hover:bg-hover" : "hover:bg-surface"
      }`}
    >
      <div className="relative self-start">
        <Avatar src={item.actor.avatar} className="size-10" />
        <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border border-line bg-bg text-ink">
          <KindIcon kind={item.kind} />
        </span>
      </div>

      <div className="min-w-0 flex-1 text-[15px] leading-snug">
        <p className="break-words text-ink">
          <span className="font-semibold">{item.actor.name}</span>
          {others > 0 && ` და ${others} სხვა`}
        </p>
        <p className="mt-0.5 break-words text-ink">{action(item, others > 0)}</p>
        {item.excerpt && (
          <p className="mt-1 line-clamp-2 break-words whitespace-pre-line text-muted">{item.excerpt}</p>
        )}
        <time dateTime={item.dateTime} className="mt-1 block text-sm text-muted">
          {item.time}
        </time>
      </div>

      {item.unread && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ink">
          <span className="sr-only">ახალი</span>
        </span>
      )}
    </Link>
  );
}

// The name sits on its own line above, so the verb never needs it declined.
function action(item: Notification, many: boolean): ReactNode {
  const title = item.postTitle && <span className="font-medium">„{item.postTitle}“</span>;
  switch (item.kind) {
    case "follow":
      return "გამოგიწერა";
    case "comment":
      return <>კომენტარი დაგიტოვა ბლოგზე {title}</>;
    case "reply":
      return "გიპასუხა კომენტარზე";
    case "post_like":
      return <>{many ? "მოიწონეს" : "მოიწონა"} შენი ბლოგი {title}</>;
    case "comment_like":
      return `${many ? "მოიწონეს" : "მოიწონა"} შენი კომენტარი`;
  }
}

function KindIcon({ kind }: { kind: Notification["kind"] }) {
  const like = kind === "post_like" || kind === "comment_like";
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3"
      fill={like ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {like ? (
        <path d="M12 20.5s-8-4.6-8-10.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.9c0 6-8 10.6-8 10.6z" />
      ) : kind === "follow" ? (
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6" />
      ) : (
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      )}
    </svg>
  );
}
