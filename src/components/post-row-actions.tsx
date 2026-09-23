'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ExternalLink, MoreHorizontal, PenLine, Trash2 } from 'lucide-react';
import { deletePostAction } from '@/app/actions/posts';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from '@/components/toaster';

/** The ⋯ menu on each dashboard row: open, edit, delete. */
export function PostRowActions({
  postId,
  slug,
  published,
}: {
  postId: string;
  slug: string;
  published: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function onDelete() {
    startTransition(async () => {
      const result = await deletePostAction(postId);
      // Success redirects; anything that returns is a refusal.
      if (result && !result.ok) {
        setConfirming(false);
        toast(result.error ?? 'წაშლა ვერ მოხერხდა.', 'error');
      }
    });
  }

  const item =
    'flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-muted transition-colors hover:bg-hover hover:text-ink';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="მოქმედებები"
        className="flex size-9 items-center justify-center rounded-full text-subtle transition-colors hover:bg-hover hover:text-ink"
      >
        <MoreHorizontal className="size-[18px]" />
      </button>
      {open ? (
        <div
          role="menu"
          className="animate-pop-in absolute top-10 right-0 z-30 w-48 overflow-hidden rounded-2xl border border-line bg-raised py-1 shadow-lift"
        >
          <Link href={`/write/${postId}`} role="menuitem" className={item}>
            <PenLine className="size-4" />
            რედაქტირება
          </Link>
          {published ? (
            <Link href={`/p/${slug}`} role="menuitem" className={item}>
              <ExternalLink className="size-4" />
              ნახვა
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setConfirming(true);
            }}
            className={`${item} text-danger hover:text-danger`}
          >
            <Trash2 className="size-4" />
            წაშლა
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title="წავშალოთ სტატია?"
        description="სტატია, მისი კომენტარები და სტატისტიკა სამუდამოდ წაიშლება."
        confirmLabel="წაშლა"
        pending={pending}
        onConfirm={onDelete}
        onClose={() => setConfirming(false)}
      />
    </div>
  );
}
