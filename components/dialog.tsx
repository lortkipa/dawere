"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { DialogArt, type DialogArtName } from "./dialog-art";

// A modal on the native <dialog>, which brings the backdrop, focus trap and Escape. It opens on
// mount, so render it only while it should be visible. An illustration sits in a banner on top,
// then the title, the body and, from `DialogFooter`, the buttons under a divider.
export function Dialog({
  title,
  art,
  wide = false,
  onClose,
  children,
}: {
  title: string;
  art: DialogArtName;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const root = document.documentElement;
    root.style.overflow = "hidden";
    return () => {
      dialog?.close();
      root.style.overflow = "";
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Only a press that starts and ends on the backdrop closes, so selecting text in an
      // input and releasing outside doesn't.
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? "max-w-xl" : "max-w-md"} max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl border border-line bg-bg p-0 text-ink shadow-xl open:flex open:animate-dialog-in backdrop:bg-black/50`}
    >
      {/* Hidden on short screens, such as a phone with the keyboard up, so the field stays in view. */}
      <div className="flex h-32 shrink-0 justify-center bg-accent-soft [@media(max-height:36rem)]:hidden">
        <DialogArt name={art} className="h-full" />
      </div>
      {/* A flex column capped at the viewport, so a long body can scroll between a fixed title and buttons. */}
      <div className="flex min-h-0 flex-1 flex-col px-6 pt-5 pb-5">
        <h2 id={titleId} className="pr-10 text-xl font-semibold">
          {title}
        </h2>
        <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
      {/* Last in the DOM so showModal() focuses the dialog's field rather than this button. */}
      <button
        type="button"
        aria-label="დახურვა"
        onClick={onClose}
        className="absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-full bg-bg text-muted shadow-sm transition-colors hover:bg-surface hover:text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </dialog>
  );
}

// The buttons at the bottom of a dialog, under a divider that runs edge to edge.
export function DialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-6 mt-5 -mb-5 flex shrink-0 justify-end gap-2 border-t border-line px-6 py-4">{children}</div>
  );
}
