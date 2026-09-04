import Link from "next/link";
import { BellIcon } from "@/components/icons/BellIcon";
import { unreadCount } from "@/lib/notifications";
import styles from "./NotificationsBell.module.css";

/**
 * The bell in the top bar, and the only place the platform interrupts anybody:
 * a number on a link, on whichever page they were already reading. Nothing
 * pushes, nothing polls — the count is read with the page, so it is as fresh as
 * everything else on it and one navigation stale after that.
 *
 * It is a link to a page rather than a panel that opens over the bar, for the
 * reason `/search` is a page: news is a list with a shape and a history, and a
 * dropdown would make it the one thing here that cannot be linked to, scrolled
 * or come back to. The bell says how much; the page says what.
 *
 * Async so that no page has to fetch the count and hand it down — the bar is
 * the only thing that shows it, so the bar is what asks.
 */
export async function NotificationsBell({ userId }: { userId: string }) {
  const unread = await unreadCount(userId);

  return (
    <Link
      href="/notifications"
      className={styles.bell}
      // The badge is decoration to a screen reader; the label is the count.
      aria-label={
        unread > 0 ? `შეტყობინებები — ${unread} ახალი` : "შეტყობინებები"
      }
    >
      <BellIcon />

      {unread > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {/* Past two digits the exact number stops being worth the width, and
              the badge stops fitting the bell it sits on. */}
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
