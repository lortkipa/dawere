"use client";

import { AlertIcon } from "@/components/icons/AlertIcon";
import { CheckIcon } from "@/components/icons/CheckIcon";
import { Button } from "./Button";
import { Modal } from "./Modal";
import styles from "./ResultModal.module.css";

type ResultModalProps = {
  open: boolean;
  onClose: () => void;
  /** Whether the thing that just happened worked. */
  tone: "done" | "failed";
  heading: string;
  note?: string;
  /** The buttons out. One tinted „კარგი“ when the caller has nothing to add. */
  children?: React.ReactNode;
};

/**
 * How the platform reports the end of something it was asked to do: a mark over
 * a line saying what happened, and a way out. Publishing an article, saving a
 * profile — the answer looks the same wherever it comes from, and the only thing
 * that changes between them is which of the two colours it wears.
 */
export function ResultModal({
  open,
  onClose,
  tone,
  heading,
  note,
  children,
}: ResultModalProps) {
  return (
    <Modal open={open} onClose={onClose} label={heading}>
      <div className={`${styles.result} ${styles[tone]}`}>
        <div className={styles.head}>
          <span className={styles.mark} aria-hidden="true">
            {tone === "done" ? <CheckIcon /> : <AlertIcon />}
          </span>

          <h2 className={styles.heading}>{heading}</h2>
          {note && <p className={styles.note}>{note}</p>}
        </div>

        <div className={styles.buttons}>
          {children ?? (
            <Button fullWidth className={styles.dismiss} onClick={onClose}>
              კარგი
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
