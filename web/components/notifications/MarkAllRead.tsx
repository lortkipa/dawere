"use client";

import { useTransition } from "react";
import { markAllNotificationsRead } from "@/app/actions/notifications";
import { Button } from "@/components/ui/Button";
import styles from "./Notifications.module.css";

/**
 * Says the whole list has been seen, which for most of it is true: news is
 * mostly read off the list itself — somebody liked this, somebody followed
 * that — and only some of it is worth opening. Without this the badge would
 * outlast the reading of it, and a number that will not go down stops being
 * read at all.
 *
 * Nothing is painted early. The rows do not change until the server says they
 * have, and then they all change together with the badge above them and this
 * button itself, which is the whole of what the press was for — worth the round
 * trip to be sure of, unlike a like. Until then it sits disabled, and the list
 * underneath keeps the tint it was drawn with.
 *
 * Shown only when something is unread, so it is never a button that does
 * nothing — see the page.
 */
export function MarkAllRead() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      className={styles.clearAll}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsRead();
        })
      }
    >
      ყველა წაკითხულად მონიშვნა
    </Button>
  );
}
