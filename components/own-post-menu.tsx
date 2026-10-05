"use client";

import { useCallback, useRef, useState } from "react";
import { deleteOwnPost } from "@/app/write/actions";
import { Dialog } from "./dialog";
import { EditForm } from "./edit-form";
import { Icon, MenuItem, menuClass, useDismiss } from "./menu";

type Result = { error: string } | void;

// The "…" menu on a post the reader wrote: edit it, or delete it after a confirmation.
export function OwnPostMenu({
  id,
  href,
  comments,
  onDeleted,
}: {
  id: string;
  // The post's page; the editor is at its /edit.
  href: string;
  comments: number;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, ref, close);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="მეტი"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="19" cy="12" r="1.75" />
        </svg>
      </button>

      {open && (
        <div role="menu" className={`${menuClass} w-48`}>
          <MenuItem icon={<PencilIcon />} href={`${href}/edit`} onClick={close}>
            რედაქტირება
          </MenuItem>
          <MenuItem
            icon={<TrashIcon />}
            danger
            onClick={() => {
              close();
              setConfirming(true);
            }}
          >
            წაშლა
          </MenuItem>
        </div>
      )}

      {confirming && (
        <DeletePostDialog
          comments={comments}
          remove={async () => {
            const result = await deleteOwnPost(id);
            if (!result) onDeleted();
            return result;
          }}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

// Shared with the admin panel, whose `remove` deletes any post it may manage.
export function DeletePostDialog({
  comments,
  remove,
  onClose,
}: {
  comments: number;
  remove: () => Promise<Result>;
  onClose: () => void;
}) {
  return (
    <Dialog title="ბლოგის წაშლა" onClose={onClose}>
      <EditForm canSave save={remove} onClose={onClose} saveLabel="წაშლა" danger>
        <p className="text-center text-muted">
          ბლოგი, მისი ფოტოები{comments > 0 ? `, ${comments} კომენტარი` : ""} და მოწონებები სამუდამოდ წაიშლება.
        </p>
      </EditForm>
    </Dialog>
  );
}

function PencilIcon() {
  return (
    <Icon>
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />
    </Icon>
  );
}

function TrashIcon() {
  return (
    <Icon>
      <path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2l1-12M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7" />
    </Icon>
  );
}
