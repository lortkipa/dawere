"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions/account";
import { TrashIcon } from "@/components/icons/TrashIcon";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import styles from "./DeleteAccount.module.css";

/** Not a password — a pause, in the one place on the platform that needs one. */
const CONFIRM = "წაშლა";

export function DeleteAccount({ articles }: { articles: number }) {
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();

  const close = () => {
    // Closing mid-delete would leave them looking at an account already gone.
    if (pending) return;
    setAsking(false);
    setTyped("");
  };

  const remove = () =>
    startTransition(async () => {
      // Ends in a sign-out and a redirect home, so there is no state to put
      // back afterwards: this page goes away with the account.
      await deleteAccount();
    });

  return (
    <>
      <Button className={styles.trigger} onClick={() => setAsking(true)}>
        <TrashIcon />
        ანგარიშის წაშლა
      </Button>

      <Modal open={asking} onClose={close} label="ანგარიშის წაშლა">
        <h2 className={styles.heading}>ნამდვილად წაიშალოს ანგარიში?</h2>

        <p className={styles.note}>
          {articles > 0
            ? `${articles} სტატია, მათი ბმულები, შენი გვერდი და ანგარიში — ყველაფერი სამუდამოდ ქრება.`
            : "შენი გვერდი და ანგარიში სამუდამოდ ქრება."}
        </p>

        {articles > 0 && (
          <p className={styles.note}>
            თუ დაწერილის შენახვა გინდა,{" "}
            <a href="/api/export" download>
              ჯერ ჩამოტვირთე
            </a>
            .
          </p>
        )}

        <label className={styles.confirmField}>
          <span className={styles.confirmLabel}>
            დასადასტურებლად აკრიფე „{CONFIRM}“
          </span>
          <input
            className={styles.input}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            disabled={pending}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className={styles.buttons}>
          <Button
            variant="outline"
            className={styles.cancel}
            disabled={pending}
            onClick={close}
          >
            გაუქმება
          </Button>
          <Button
            className={styles.confirm}
            disabled={pending || typed.trim() !== CONFIRM}
            onClick={remove}
          >
            {pending ? "იშლება…" : "წაშლა"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
