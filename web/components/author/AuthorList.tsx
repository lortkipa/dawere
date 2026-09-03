import Link from "next/link";
import { FollowButton } from "@/components/follow/FollowButton";
import { Avatar } from "@/components/ui/Avatar";
import styles from "./AuthorList.module.css";

/** An author as any list of people shows them: who they are, and the button. */
export type AuthorRow = {
  id: string;
  name: string;
  handle: string;
  image: string | null;
  bio: string;
  /** Shown only when there is no bio — a line either way keeps rows one height. */
  posts: number;
  /** Whether the viewer follows them already: the state the button opens in. */
  following: boolean;
};

/**
 * A list of people, wherever the platform offers one: the authors an empty feed
 * suggests, and the authors a search found. Not cards — the cards on both those
 * pages are articles, and a hairline row keeps that difference visible.
 */
export function AuthorList({
  heading,
  id,
  authors,
  signedIn,
  className,
}: {
  heading: string;
  /** Ties the heading to its section for a screen reader. */
  id: string;
  authors: AuthorRow[];
  signedIn: boolean;
  /** Where the block sits on the page — the rule above it, if it has one. */
  className?: string;
}) {
  return (
    <section
      className={className ? `${styles.block} ${className}` : styles.block}
      aria-labelledby={id}
    >
      <h2 id={id} className={styles.heading}>
        {heading}
      </h2>

      <ul className={styles.list}>
        {authors.map((author) => (
          <li key={author.id} className={styles.row}>
            <Link href={`/${author.handle}`} className={styles.who}>
              <Avatar
                name={author.name}
                image={author.image}
                size={44}
                className={styles.avatar}
              />
              <span className={styles.text}>
                <span className={styles.name}>{author.name}</span>
                <span className={styles.note}>
                  {author.bio || `${author.posts} სტატია`}
                </span>
              </span>
            </Link>

            <FollowButton
              authorId={author.id}
              following={author.following}
              signedIn={signedIn}
              className={styles.follow}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
