import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { DeleteArticleButton } from "@/components/article/DeleteArticleButton";
import { PencilIcon } from "@/components/icons/PencilIcon";
import { TrashIcon } from "@/components/icons/TrashIcon";
import { formatDate } from "@/lib/date";
import styles from "./PostList.module.css";

/** One published article, as the author's page selects it. */
export type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  views: number;
  publishedAt: Date | null;
  updatedAt: Date;
};

type PostListProps = {
  posts: Post[];
  /** The viewer wrote these, so every card carries the two controls only they get. */
  owner: boolean;
  /** Where a delete lands — this page, so the list closes over the gap in place. */
  returnTo: string;
};

/**
 * Everything an author has published, as a reader gets it. The card is the same
 * for everyone; the author gets a strip added to its foot, the way their own
 * article gets a panel above it rather than a different article.
 */
export function PostList({ posts, owner, returnTo }: PostListProps) {
  return (
    <ul className={styles.list}>
      {posts.map((post) => (
        <li key={post.id}>
          <article className={styles.card}>
            <h2 className={styles.title}>
              {/* Carries the overlay that makes the whole card one target. */}
              <Link href={`/a/${post.slug}`}>{post.title}</Link>
            </h2>

            {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}

            <p className={styles.meta}>
              {formatDate(post.publishedAt ?? post.updatedAt)} · {post.views}{" "}
              ნახვა
            </p>

            {owner && (
              <div className={styles.owner}>
                <ButtonLink
                  variant="ghost"
                  href={`/write/${post.id}`}
                  className={styles.action}
                >
                  <PencilIcon />
                  რედაქტირება
                </ButtonLink>
                <DeleteArticleButton
                  id={post.id}
                  title={post.title}
                  icon={<TrashIcon />}
                  returnTo={returnTo}
                  className={styles.action}
                />
              </div>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
