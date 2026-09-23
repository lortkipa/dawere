'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, Compass, Home, PenLine } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';

const DESKTOP = [
  { href: '/', label: 'მთავარი', match: (p: string) => p === '/' },
  { href: '/search', label: 'აღმოაჩინე', match: (p: string) => p.startsWith('/search') || p.startsWith('/topic') },
];

/** The two top-level destinations beside the logo, from md up. */
export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="მთავარი ნავიგაცია">
      {DESKTOP.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              active ? 'bg-sunken text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Phones get a tab bar at the thumb instead of a menu at the top. */
export function MobileNav({
  user,
}: {
  user: { name: string; username: string; avatarUrl: string | null };
}) {
  const pathname = usePathname();
  const profileHref = `/u/${user.username}`;
  const items = [
    { href: '/', label: 'მთავარი', icon: Home, active: pathname === '/' },
    {
      href: '/search',
      label: 'ძიება',
      icon: Compass,
      active: pathname.startsWith('/search') || pathname.startsWith('/topic'),
    },
    { href: '/write', label: 'დაწერე', icon: PenLine, active: false, primary: true },
    { href: '/bookmarks', label: 'შენახული', icon: Bookmark, active: pathname.startsWith('/bookmarks') },
  ];

  return (
    <nav
      aria-label="მობილური ნავიგაცია"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
        {items.map(({ href, label, icon: Icon, active, primary }) => (
          <Link
            key={href}
            href={href}
            prefetch={primary ? false : undefined}
            aria-current={active ? 'page' : undefined}
            className="flex flex-col items-center gap-1 text-[11px] font-medium"
          >
            {primary ? (
              <span className="flex h-8 w-12 items-center justify-center rounded-full bg-primary text-primary-contrast">
                <Icon className="size-[18px]" />
              </span>
            ) : (
              <Icon className={cn('size-[22px]', active ? 'text-ink' : 'text-subtle')} strokeWidth={active ? 2.25 : 1.75} />
            )}
            <span className={active ? 'text-ink' : 'text-subtle'}>{label}</span>
          </Link>
        ))}
        <Link
          href={profileHref}
          aria-current={pathname === profileHref ? 'page' : undefined}
          className="flex flex-col items-center gap-1 text-[11px] font-medium"
        >
          <Avatar
            name={user.name}
            src={user.avatarUrl}
            size="xs"
            className={cn('size-[22px]', pathname === profileHref && 'ring-2 ring-ink')}
          />
          <span className={pathname === profileHref ? 'text-ink' : 'text-subtle'}>პროფილი</span>
        </Link>
      </div>
    </nav>
  );
}
