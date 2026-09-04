"use client";

import { startTransition } from "react";
import Link from "next/link";
import { markNotificationRead } from "@/app/actions/notifications";

type NotificationLinkProps = {
  /** The row being opened. The reader is never sent — the action reads it. */
  id: string;
  /** The article, at the comment the news names. */
  href: string;
  /** Whether there is anything to mark. Read rows write nothing on the way out. */
  unread: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * The whole row, which is one link, which is also the only thing that reads a
 * notification: the click that opens the article marks the news about it. So
 * the page draws what is new and leaves it that way, and the list empties in
 * the order the reader gets to it rather than all at once on arrival.
 *
 * Fire-and-forget on the way out. The write is one column of one row the reader
 * owns, there is nothing on the page waiting for its answer, and the navigation
 * is not held up for it — a request in flight survives a client-side one. What
 * it comes back with is the list rebuilt without this row's tint, for whenever
 * the reader comes back to look at it. In a transition, because that rebuild
 * lands on a page the reader has usually already left.
 *
 * Everything inside is rendered on the server and handed through, so the row's
 * sentence, its avatar and its time stay out of the browser's bundle: this is a
 * click handler wrapped around them and nothing else.
 */
export function NotificationLink({
  id,
  href,
  unread,
  className,
  children,
}: NotificationLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        if (!unread) return;

        startTransition(async () => {
          await markNotificationRead(id);
        });
      }}
    >
      {children}
    </Link>
  );
}
