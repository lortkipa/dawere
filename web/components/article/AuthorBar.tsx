"use client";

import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { PencilIcon } from "@/components/icons/PencilIcon";
import { TrashIcon } from "@/components/icons/TrashIcon";
import { DeleteArticleButton } from "./DeleteArticleButton";
import styles from "./AuthorBar.module.css";

type AuthorBarProps = {
  id: string;
  title: string;
  /** The article's public address, exactly as a reader would receive it. */
  url: string;
  views: number;
  publishedAt: string;
};

/**
 * What the author sees on their own article and nobody else does: where it
 * lives, how it is doing, and the two things only they can do to it. Everything
 * below it on the page is the article as a reader gets it.
 */
export function AuthorBar({
  id,
  title,
  url,
  views,
  publishedAt,
}: AuthorBarProps) {
  const [copied, setCopied] = useState(false);
  const resetCopied = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetCopied.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(resetCopied.current);
      resetCopied.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission can be refused, and there is nothing to say about
      // it — the address is right there, selectable.
    }
  };

  return (
    <aside className={styles.bar} aria-label="ავტორის პანელი">
      {/* No "this is yours" badge: only the author is ever shown this panel,
          so saying it is whose it is tells them nothing they came for. */}
      <span className={styles.date}>გამოქვეყნდა {publishedAt}</span>

      <div className={styles.link}>
        {/* Truncates from the tail when there is no room. The protocol is
            dropped because it is the least useful part of the line — the copy
            button still hands over the whole address. */}
        <span className={styles.url}>{url.replace(/^https?:\/\//, "")}</span>
        <button type="button" className={styles.copy} onClick={copy}>
          {copied ? "დაკოპირდა" : "კოპირება"}
        </button>
      </div>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt className={styles.statLabel}>ნახვა</dt>
          <dd className={styles.statValue}>{views}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <ButtonLink
          variant="outline"
          href={`/write/${id}`}
          className={styles.edit}
        >
          <PencilIcon />
          რედაქტირება
        </ButtonLink>
        <DeleteArticleButton
          id={id}
          title={title}
          icon={<TrashIcon />}
          className={styles.delete}
        />
      </div>
    </aside>
  );
}
