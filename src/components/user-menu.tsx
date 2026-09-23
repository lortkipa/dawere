'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BarChart3, ChevronsUpDown, LogOut, Settings, User } from 'lucide-react';
import { Avatar, MENU_CLASS, MENU_ITEM_CLASS } from '@/components/ui';
import { cn } from '@/lib/utils';
import { signOutAction } from '@/app/actions/auth';

/**
 * The account menu. In the sidebar it sits at the bottom and opens upward (the
 * sidebar already lists the main destinations); in the phone top bar it is just
 * the avatar and opens downward.
 */
export function UserMenu({
  name,
  username,
  avatarUrl,
  placement = 'bottom',
  variant = 'avatar',
  className,
}: {
  name: string;
  username: string;
  avatarUrl: string | null;
  placement?: 'top' | 'bottom';
  variant?: 'avatar' | 'row';
  className?: string;
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

  const links = [
    { href: `/u/${username}`, label: 'პროფილი', icon: User },
    ...(variant === 'avatar' ? [{ href: '/dashboard', label: 'პანელი', icon: BarChart3 }] : []),
    { href: '/settings', label: 'პარამეტრები', icon: Settings },
  ];

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center rounded-lg transition-colors focus-visible:outline-2',
          variant === 'row' ? 'gap-2.5 p-1 hover:bg-hover xl:w-full xl:px-2 xl:py-1.5' : 'rounded-full',
          open && variant === 'row' && 'bg-hover',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="ანგარიშის მენიუ"
      >
        <Avatar name={name} src={avatarUrl} size="sm" />
        {variant === 'row' ? (
          <>
            <span className="hidden min-w-0 flex-1 text-left xl:block">
              <span className="block truncate text-[13px] font-medium text-ink">{name}</span>
              <span className="block truncate text-[12px] text-subtle">@{username}</span>
            </span>
            <ChevronsUpDown className="hidden size-4 shrink-0 text-subtle xl:block" />
          </>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            MENU_CLASS,
            'absolute w-60',
            placement === 'top' ? 'bottom-full left-0 mb-2' : 'top-full right-0 mt-2',
          )}
        >
          <div className="px-2.5 pt-2 pb-2.5">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            <p className="truncate text-[12px] text-subtle">@{username}</p>
          </div>
          <div className="-mx-1 mb-1 border-t border-line" />
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)} className={MENU_ITEM_CLASS}>
              <Icon />
              {label}
            </Link>
          ))}
          <div className="-mx-1 my-1 border-t border-line" />
          <form action={signOutAction}>
            <button type="submit" role="menuitem" className={MENU_ITEM_CLASS}>
              <LogOut />
              გასვლა
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
