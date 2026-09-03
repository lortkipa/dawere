"use client";

import { useActionState, useEffect, useState } from "react";
import { updateProfile, type ProfileState } from "@/app/actions/account";
import { Button } from "@/components/ui/Button";
import { ResultModal } from "@/components/ui/ResultModal";
import type { Account } from "@/lib/account";
import { handleFor, MAX_NAME } from "@/lib/handle";
import styles from "./ProfileForm.module.css";

const MAX_BIO = 240;

const IDLE: ProfileState = { saved: false, error: null };

type ProfileFormProps = {
  account: Account;
  bio: string;
  /** Where this dawere answers, so the address shown is the real one. */
  origin: string;
};

export function ProfileForm({ account, bio, origin }: ProfileFormProps) {
  const [state, save, pending] = useActionState(updateProfile, IDLE);

  const [name, setName] = useState(account.name);
  const [about, setAbout] = useState(bio);

  // The dialog stands until it is dismissed, and a fresh answer from the server
  // is a fresh dialog.
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(false), [state]);

  // The same function the Server Action saves with, so the line under the name
  // is the address the save would actually mint — not a guess at it.
  const address = `${origin.replace(/^https?:\/\//, "")}/${handleFor(name, account.id)}`;

  return (
    <>
      <form action={save} className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>სახელი</span>
          <input
            name="name"
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={MAX_NAME}
            required
            autoComplete="name"
          />
          <span className={styles.hint}>
            მხოლოდ ლათინური ასოები, სულ მცირე ერთი სიტყვა.
          </span>
        </label>

        <div className={styles.field}>
          <span className={styles.label}>შენი მისამართი</span>
          {/* Not a field. It is the first word of the name plus the head of the
              row id, so the only way to move it is to be called something
              else. */}
          <p className={styles.address}>{address}</p>
          <span className={styles.hint}>
            მისამართი სახელისგან იქმნება და ცალკე არ იცვლება. სახელს თუ შეცვლი,
            ძველ ბმულზე ვეღარავინ მოხვდება — სტატიების ბმულები კი უცვლელი
            რჩება.
          </span>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>შენს შესახებ</span>
          <textarea
            name="bio"
            className={styles.textarea}
            rows={3}
            value={about}
            onChange={(event) => setAbout(event.target.value)}
            maxLength={MAX_BIO}
            placeholder="ერთი-ორი წინადადება, რომელსაც შენს გვერდზე წაიკითხავენ"
          />
          <span className={styles.counter}>
            {about.length}/{MAX_BIO}
          </span>
        </label>

        <div className={styles.foot}>
          <Button type="submit" className={styles.save} disabled={pending}>
            {pending ? "ინახება…" : "შენახვა"}
          </Button>
        </div>
      </form>

      {/* The same dialog the editor answers a publish with, in whichever of its
          two colours this save earned. */}
      <ResultModal
        open={!dismissed && (state.saved || state.error !== null)}
        onClose={() => setDismissed(true)}
        tone={state.error ? "failed" : "done"}
        heading={state.error ? "ვერ შეინახა" : "შენახულია"}
        note={
          state.error ??
          (state.moved
            ? `შენი გვერდი ახლა ${address}-ზეა.`
            : "პროფილი განახლდა.")
        }
      />
    </>
  );
}
