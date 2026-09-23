'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Bookmark, LogOut, PenLine, Settings, User } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';
import { signOutAction } from '@/app/actions/auth';

const LINKS = [
  { href: '/dashboard', label: 'სტატისტიკა და სტატიები', icon: BarChart3 },
  { href: '/bookmarks', label: 'შენახულები', icon: Bookmark },
  { href: '/settings', label: 'პარამეტრები', icon: Settings },
];

export function UserMenu({
  name,
  username,
  avatarUrl,
}: {
  name: string;
  username: string;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center rounded-full ring-offset-2 ring-offset-surface transition-shadow hover:ring-2 hover:ring-line-strong focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none',
          open && 'ring-2 ring-line-strong',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="ანგარიშის მენიუ"
      >
        <Avatar name={name} src={avatarUrl} size="sm" />
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-pop-in absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-line bg-raised shadow-lift"
        >
          <Link
            href={`/u/${username}`}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 border-b border-line px-4 py-3.5 transition-colors hover:bg-hover"
          >
            <Avatar name={name} src={avatarUrl} size="md" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ink">{name}</span>
              <span className="block truncate text-[13px] text-subtle">@{username}</span>
            </span>
          </Link>

          <div className="py-1">
            <Link
              href="/write"
              prefetch={false}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-muted transition-colors hover:bg-hover hover:text-ink md:hidden"
            >
              <PenLine className="size-4" />
              დაწერე
            </Link>
            <Link
              href={`/u/${username}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-muted transition-colors hover:bg-hover hover:text-ink"
            >
              <User className="size-4" />
              პროფილი
            </Link>
            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-muted transition-colors hover:bg-hover hover:text-ink"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </div>

          <form action={signOutAction} className="border-t border-line py-1">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-muted transition-colors hover:bg-hover hover:text-ink"
            >
              <LogOut className="size-4" />
              გასვლა
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

