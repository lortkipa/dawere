"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Button } from "./button";
import { DialogFooter } from "./dialog";

export const errorClass = "text-error";

type Result = { error: string } | void;

// The form inside every dialog: the field, one line for a hint or error, then the buttons.
// `save` returns an error to show, or nothing once it has saved.
export function EditForm({
  canSave,
  save,
  onClose,
  onSaved = onClose,
  hint,
  counter,
  saveLabel = "შენახვა",
  danger = false,
  children,
}: {
  canSave: boolean;
  save: () => Promise<Result>;
  onClose: () => void;
  // What happens after a save; closing, unless the dialog has more to say.
  onSaved?: () => void;
  hint?: ReactNode;
  counter?: string;
  saveLabel?: string;
  danger?: boolean;
  children: ReactNode;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave || pending) return;
    setError("");
    startTransition(async () => {
      const result = await save();
      if (result?.error) setError(result.error);
      else onSaved();
    });
  }

  return (
    <form noValidate onSubmit={handleSubmit} onChange={() => setError("")} className="flex min-h-0 flex-1 flex-col">
      {/* Only this part scrolls; the padding keeps focus rings from being clipped. */}
      <div className="-m-1 min-h-0 overflow-y-auto p-1">{children}</div>
      {(hint || counter || error) && (
        <div className="mt-2 flex min-h-5 justify-between gap-4 text-sm">
          <p aria-live="polite" className={`min-w-0 break-words ${error ? errorClass : "text-muted"}`}>
            {error || hint}
          </p>
          {counter && <span className="shrink-0 text-muted tabular-nums">{counter}</span>}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          გაუქმება
        </Button>
        <Button type="submit" variant={danger ? "danger" : "primary"} disabled={!canSave || pending}>
          {saveLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
