'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ExternalLink, MoreHorizontal, PenLine, Trash2 } from 'lucide-react';
import { deletePostAction } from '@/app/actions/posts';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from '@/components/toaster';
import { MENU_CLASS, MENU_ITEM_CLASS } from '@/components/ui';
import { cn } from '@/lib/utils';

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


  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="მოქმედებები"
        className="flex size-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-ink"
      >
        <MoreHorizontal className="size-[18px]" />
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(MENU_CLASS, 'absolute top-full right-0 mt-1 w-48')}
        >
          <Link href={`/write/${postId}`} role="menuitem" className={MENU_ITEM_CLASS}>
            <PenLine />
            რედაქტირება
          </Link>
          {published ? (
            <Link href={`/p/${slug}`} role="menuitem" className={MENU_ITEM_CLASS}>
              <ExternalLink />
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
            className={cn(MENU_ITEM_CLASS, 'text-danger hover:bg-danger-soft hover:text-danger')}
          >
            <Trash2 />
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
