import { formatSince } from "@/lib/date";
import type { NotificationView } from "@/lib/notifications";
import { Avatar } from "@/components/ui/Avatar";
import { NotificationLink } from "./NotificationLink";
import styles from "./Notifications.module.css";

/**
 * The whole of somebody's news, newest first. Every row is the same three
 * things — who, what they did, and the thing they did it to — so five kinds of
 * event read as one list rather than as five designs sharing a page.
 *
 * The whole row is the link, because every one of them has exactly one place to
 * go: the article it happened under, at the comment it names. And going there
 * is what reads it: the row is tinted until the reader opens it, or until they
 * say they are done with the lot — see `NotificationLink` and `MarkAllRead`.
 */
export function NotificationList({ news }: { news: NotificationView[] }) {
  return (
    <ul className={styles.list}>
      {news.map((row) => {
        const { verb, subject, where } = describe(row);

        return (
          <li
            key={row.id}
            className={
              row.unread ? `${styles.row} ${styles.unread}` : styles.row
            }
          >
            <NotificationLink
              id={row.id}
              href={row.href}
              unread={row.unread}
              className={styles.link}
            >
              <Avatar
                name={row.actor.name}
                image={row.actor.image}
                size={40}
                className={styles.avatar}
              />

              <span className={styles.text}>
                <span className={styles.said}>
                  <span className={styles.name}>{row.actor.name}</span> {verb}
                  {/* The tint says it to everybody else, and a colour is not
                      something everybody has. */}
                  {row.unread && (
                    <span className={styles.hidden}> — ახალი</span>
                  )}
                </span>

                {subject && <span className={styles.subject}>{subject}</span>}
                {where && <span className={styles.where}>{where}</span>}
              </span>

              <span className={styles.aside}>
                {/* How long ago, not which day: news is read as a list of what
                    has just happened, the way a conversation is. */}
                <time
                  className={styles.time}
                  dateTime={row.createdAt.toISOString()}
                >
                  {formatSince(row.createdAt)}
                </time>
                {/* Always drawn, so nothing shifts when it goes out — and it
                    goes out rather than disappearing, with the tint behind it,
                    once the row has been read. */}
                <span className={styles.dot} aria-hidden="true" />
              </span>
            </NotificationLink>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * What each kind says. One sentence about the person, the thing itself under
 * it, and — where the thing is a comment — the article it was said on, because
 * a comment out of its piece is a sentence from nowhere. Where the thing *is*
 * the article, its title is already the line above and there is nothing to add.
 *
 * A comment arrives in quotation marks and a title does not: one is speech and
 * the other is a name, and that is the whole difference between the two lines.
 */
function describe(row: NotificationView): {
  verb: string;
  subject: string | null;
  where: string | null;
} {
  switch (row.kind) {
    case "article_like":
      return {
        verb: "მოიწონა შენი სტატია",
        subject: row.articleTitle,
        where: null,
      };
    case "comment_like":
      return {
        verb: "მოიწონა შენი კომენტარი",
        subject: quoted(row.quote),
        where: row.articleTitle,
      };
    case "comment":
      return {
        verb: "კომენტარი დატოვა შენს სტატიაზე",
        subject: quoted(row.quote),
        where: row.articleTitle,
      };
    case "reply":
      return {
        verb: "უპასუხა შენს კომენტარს",
        subject: quoted(row.quote),
        where: row.articleTitle,
      };
    // The one row that is not about anything of the reader's, and it shows: the
    // title is the whole of it, with no comment under it and nowhere else to
    // say it was published on.
    case "published":
      return {
        verb: "გამოაქვეყნა ახალი სტატია",
        subject: row.articleTitle,
        where: null,
      };
  }
}

function quoted(text: string | null): string | null {
  return text === null ? null : `„${text}“`;
}
