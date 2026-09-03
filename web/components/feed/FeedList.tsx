import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/date";
import styles from "./FeedList.module.css";

/** One published article, as the feed selects it: the piece and who wrote it. */
export type FeedPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: Date | null;
  updatedAt: Date;
  author: {
    name: string;
    handle: string;
    image: string | null;
  };
};

/**
 * The same card the author's page uses, with the byline it does not need — there
 * every article has the same author, and here that is the whole point of the
 * page. The byline is a link of its own, so the card leads to the article and
 * the name leads to everything else they have written.
 */
export function FeedList({ posts }: { posts: FeedPost[] }) {
  return (
    <ul className={styles.list}>
      {posts.map((post) => (
        <li key={post.id}>
          <article className={styles.card}>
            <header className={styles.by}>
              {/* Above the overlay below, or the card would swallow its click. */}
              <Link href={`/${post.author.handle}`} className={styles.author}>
                <Avatar
                  name={post.author.name}
                  image={post.author.image}
                  size={28}
                  className={styles.avatar}
                />
                <span className={styles.name}>{post.author.name}</span>
              </Link>
              <span className={styles.dot} aria-hidden="true">
                ·
              </span>
              <span className={styles.date}>
                {formatDate(post.publishedAt ?? post.updatedAt)}
              </span>
            </header>

            <h2 className={styles.title}>
              {/* Carries the overlay that makes the whole card one target. */}
              <Link href={`/a/${post.slug}`}>{post.title}</Link>
            </h2>

            {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
          </article>
        </li>
      ))}
    </ul>
  );
}
