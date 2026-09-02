"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { PencilIcon } from "@/components/icons/PencilIcon";
import { SearchIcon } from "@/components/icons/SearchIcon";
import type { Account } from "@/lib/account";
import { AccountMenu } from "@/components/account/AccountMenu";
import styles from "./DashboardNav.module.css";

export function DashboardNav({ account }: { account: Account }) {
  // The query only drives the field itself for now — it starts filtering once
  // there is an article list under it.
  const [query, setQuery] = useState("");
  // Below 760px the field is hidden behind a magnifier and opens over the nav.
  const [searchOpen, setSearchOpen] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  const openSearch = () => {
    setSearchOpen(true);
    // The field is display:none until this render commits, so focus has to wait.
    requestAnimationFrame(() => field.current?.focus());
  };

  // One × does both jobs, so the field never shows two of them: it empties the
  // query, and on the narrow layout a press on an already-empty field closes
  // the overlay.
  const dismiss = () => {
    if (query) {
      setQuery("");
      field.current?.focus();
      return;
    }
    setSearchOpen(false);
  };

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.wordmark}>
        dawere
      </Link>

      <label
        className={searchOpen ? `${styles.search} ${styles.open}` : styles.search}
        aria-label="ძიება"
      >
        <span className={styles.searchIcon}>
          <SearchIcon />
        </span>
        <input
          ref={field}
          type="search"
          className={styles.searchField}
          placeholder="მოძებნე სტატია, თემა ან ავტორი"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {(query || searchOpen) && (
          <button
            type="button"
            className={styles.dismiss}
            aria-label={query ? "გასუფთავება" : "ძიების დახურვა"}
            onClick={dismiss}
          >
            ×
          </button>
        )}
      </label>

      <span className={styles.spacer} />

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.searchToggle}
          aria-label="ძიება"
          onClick={openSearch}
        >
          <SearchIcon size={17} />
        </button>

        <ButtonLink href="/write" className={styles.write}>
          <PencilIcon />
          <span className={styles.writeLabel}>სტატიის დაწერა</span>
        </ButtonLink>

        <AccountMenu account={account} />
      </div>
    </nav>
  );
}
