"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { Avatar } from "@/components/ui/Avatar";
import { GearIcon } from "@/components/icons/GearIcon";
import { SignOutIcon } from "@/components/icons/SignOutIcon";
import { UserIcon } from "@/components/icons/UserIcon";
import type { Account } from "@/lib/account";
import styles from "./AccountMenu.module.css";

/** The signed-in person's control, in the top bar of every route they reach. */
export function AccountMenu({ account }: { account: Account }) {
  const { name, email, image, handle } = account;

  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;

    // pointerdown rather than click, so the menu is already gone by the time a
    // click lands on whatever is underneath it.
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={root}>
      <button
        type="button"
        className={styles.trigger}
        aria-label="ანგარიშის მენიუ"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <Avatar
          name={name}
          image={image}
          size={40}
          className={styles.triggerAvatar}
        />
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.identity}>
            <Avatar
              name={name}
              image={image}
              size={36}
              className={styles.identityAvatar}
            />
            <span className={styles.identityText}>
              <span className={styles.name}>{name}</span>
              <span className={styles.email}>{email}</span>
            </span>
          </div>

          <div className={styles.items}>
            {/* The author's own address, and the page as readers get it —
                what they have published, and nothing they have not. */}
            <Link
              href={`/${handle}`}
              className={styles.item}
              role="menuitem"
              onClick={close}
            >
              <UserIcon />
              ჩემი გვერდი
            </Link>
            <Link
              href="/settings"
              className={styles.item}
              role="menuitem"
              onClick={close}
            >
              <GearIcon />
              პარამეტრები
            </Link>

            <div className={styles.divider} />

            <form action={signOutAction}>
              <button
                type="submit"
                className={`${styles.item} ${styles.signOut}`}
                role="menuitem"
              >
                <SignOutIcon />
                გასვლა
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
