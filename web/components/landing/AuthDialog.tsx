"use client";

import { signInWithGoogle } from "@/app/actions/auth";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import styles from "./AuthDialog.module.css";

type AuthDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  return (
    <Modal open={open} onClose={onClose} label="dawere-ზე შესვლა">
      <form action={signInWithGoogle} className={styles.form}>
        <Button type="submit" variant="outline" fullWidth>
          <GoogleIcon />
          Google-ით გაგრძელება
        </Button>
      </form>
      {/* Facebook is not wired up yet. When it is, it needs nothing more than a
          provider in auth.ts and its own action — both providers match on email,
          so the same person gets one account either way. */}
      <Button variant="outline" fullWidth>
        <FacebookIcon />
        Facebook-ით გაგრძელება
      </Button>
    </Modal>
  );
}
