import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/account";
import { notificationFeed } from "@/lib/notifications";
import { AppNav } from "@/components/nav/AppNav";
import { SiteFooter } from "@/components/landing/Footer";
import { NotificationList } from "@/components/notifications/NotificationList";
import { MarkAllRead } from "@/components/notifications/MarkAllRead";
import { EmptyState } from "@/components/ui/EmptyState";
import styles from "./page.module.css";

/**
 * What other people have done with what this reader wrote: liked the article,
 * liked a comment on it, said something under it, answered something they said.
 * And the one piece of news that is not about them at all — an author they
 * follow published. Five kinds and one list, newest first.
 *
 * Like the feed it is a view of a reader rather than a page anybody could hand
 * out, so a signed-out visitor is sent to `/` — and unlike the feed it is not
 * where signing in lands, because news is something you go and look at.
 *
 * Opening the page reads nothing. What is new stays new until the reader opens
 * it, and the rest until they say they are through with it: a list that cleared
 * itself on arrival could only ever be looked at once, and whatever was at the
 * bottom of it was never read at all.
 */

export const metadata: Metadata = {
  title: "შეტყობინებები · dawere",
};

export default async function NotificationsPage() {
  const account = await currentAccount();

  // News belongs to a reader, so there is nothing here to show a visitor.
  if (!account) redirect("/");

  const news = await notificationFeed(account.id);

  // Counted off the rows the page already has rather than asked for a second
  // time: the bell in the bar above is the query, and this is the same answer
  // one line further down.
  const unread = news.filter((row) => row.unread).length;

  return (
    <div className={styles.page}>
      <AppNav account={account} />

      <main className={styles.main}>
        <header className={styles.head}>
          <h1 className={styles.title}>შეტყობინებები</h1>
          {news.length > 0 && (
            <div className={styles.status}>
              <p className={styles.note}>
                {unread > 0 ? `${unread} ახალი` : "ყველაფერი წაკითხულია"}
              </p>
              {/* Nothing to clear, nothing to press. */}
              {unread > 0 && <MarkAllRead />}
            </div>
          )}
        </header>

        {news.length === 0 ? (
          <EmptyState
            level={2}
            heading="ჯერ არაფერი მომხდარა"
            // Nothing to do about it but write and wait, so nothing is offered
            // — the same silence an empty feed of followed authors gets.
            note="როცა ვინმე მოიწონებს ან დააკომენტარებს შენს დაწერილს, აქ გამოჩნდება."
          />
        ) : (
          <NotificationList news={news} />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
