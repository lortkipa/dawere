"use client";

import { useState } from "react";
import { banEmail, unbanEmail } from "@/app/admin/users/actions";
import { emailPattern, normalizeEmail } from "@/lib/profile-rules";
import { Button } from "../button";
import { Dialog } from "../dialog";
import { EditForm } from "../edit-form";
import { TextInput } from "../text-input";
import { BanDialog } from "./user-editor";

// Bans an address before anyone signs up with it, or again after its account was deleted.
export function BanEmailButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const close = () => {
    setOpen(false);
    setEmail("");
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>ელფოსტის დაბლოკვა</Button>
      {open && (
        <BanDialog
          canSave={emailPattern.test(normalizeEmail(email))}
          save={(reason) => banEmail(email, reason)}
          onClose={close}
        >
          <label htmlFor="ban-email" className="mt-4 mb-1.5 block text-sm font-medium">
            ელფოსტა
          </label>
          <TextInput
            id="ban-email"
            type="email"
            autoFocus
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full"
          />
        </BanDialog>
      )}
    </>
  );
}

export function UnbanButton({ email, hasAccount }: { email: string; hasAccount: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        განბლოკვა
      </Button>
      {open && (
        <Dialog title="განბლოკვა" art="ban" onClose={close}>
          <EditForm canSave save={() => unbanEmail(email)} onClose={close} saveLabel="განბლოკვა">
            <p className="break-words text-muted">
              {hasAccount
                ? `${email} ისევ შეძლებს შესვლას. მისი პროფილი, ბლოგები და კომენტარები საიტზე დაბრუნდება.`
                : `${email} ისევ შეძლებს რეგისტრაციას.`}
            </p>
          </EditForm>
        </Dialog>
      )}
    </>
  );
}
