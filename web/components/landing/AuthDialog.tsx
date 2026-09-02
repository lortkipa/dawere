"use client";

import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type AuthDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  // TODO: wire to Auth.js v5 — signIn("google") / signIn("facebook").
  return (
    <Modal open={open} onClose={onClose} label="dawere-ზე შესვლა">
      <Button variant="outline" fullWidth>
        <GoogleIcon />
        Google-ით გაგრძელება
      </Button>
      <Button variant="outline" fullWidth>
        <FacebookIcon />
        Facebook-ით გაგრძელება
      </Button>
    </Modal>
  );
}
