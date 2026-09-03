"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/components/icons/SearchIcon";
import styles from "./SearchField.module.css";

/**
 * The one search on the site, in the bar every page carries. A form rather than
 * a live query: search is a page with an address, so submitting navigates to it
 * and the result is linkable, back-buttonable and shareable like everything
 * else here.
 *
 * On /search it opens holding what that page searched for, so the field and the
 * results agree about what the question was.
 */
export function SearchField({
  query = "",
  collapsible = true,
  className,
}: {
  query?: string;
  /**
   * In the bar there is no room for the field's width beside the wordmark and
   * the call, so it folds down to its icon and opens over the bar when tapped.
   * One placed in a page is already the width of the page and stays open.
   */
  collapsible?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [term, setTerm] = useState(query);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // A second search from the results page replaces the URL under a field that
  // is still mounted; without this it would keep the first term.
  useEffect(() => setTerm(query), [query]);

  // Opening is a tap that asks to type, so the keyboard should already be there.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <form
      role="search"
      className={[
        styles.form,
        collapsible && styles.collapsible,
        open && styles.open,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onSubmit={(event) => {
        event.preventDefault();
        const q = term.trim();
        if (!q) return;
        setOpen(false);
        router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      // Open over the bar it covers, it goes away the moment attention does.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      {/* The field's own icon where the field is shown; the thing that opens it
          where it is not. Which one is in the bar is the stylesheet's call, so
          the two never both count. */}
      <span className={styles.icon} aria-hidden="true">
        <SearchIcon />
      </span>
      <button
        type="button"
        className={styles.toggle}
        aria-label="ძებნა"
        aria-expanded={open}
        aria-controls={inputId}
        onClick={() => (open ? inputRef.current?.focus() : setOpen(true))}
      >
        <SearchIcon size={18} />
      </button>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        name="q"
        className={styles.input}
        placeholder="ავტორი ან სტატია"
        aria-label="ძებნა"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
      />
    </form>
  );
}
