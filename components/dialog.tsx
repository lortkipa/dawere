"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

// A modal on the native <dialog>, which brings the backdrop, focus trap and Escape. It opens on
// mount, so render it only while it should be visible.
export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-white p-0 text-ink shadow-lg backdrop:bg-black/40"
    >
      <div className="relative px-5 pt-6 pb-5 sm:px-6">
        <h2 id={titleId} className="px-8 text-center text-lg font-semibold">
          {title}
        </h2>
        <div className="mt-5">{children}</div>
        {/* Last in the DOM so showModal() focuses the dialog's field rather than this button. */}
        <button
          type="button"
          aria-label="დახურვა"
          onClick={onClose}
          className="absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink"
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
      </div>
    </dialog>
  );
}
