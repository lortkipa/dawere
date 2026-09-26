'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export type NavUser = { name: string; username: string; avatarUrl: string | null; isAdmin?: boolean; unread: number };

const isExplore = (p: string) => p.startsWith('/search') || p.startsWith('/topic');

/** The header's links beside the logo, from md up. */
export function HeaderNav() {
  const pathname = usePathname();
  const active = isExplore(pathname);
  return (
    <nav className="hidden items-center md:flex" aria-label="მთავარი ნავიგაცია">
      <Link
        href="/search"
        aria-current={active ? 'page' : undefined}
        className={cn(
          'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
          active ? 'text-ink' : 'text-muted hover:text-ink',
        )}
      >
        აღმოაჩინე
      </Link>
    </nav>
  );
}
