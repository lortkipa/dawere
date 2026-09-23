'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Bookmark, Compass, Home, PenLine, User } from 'lucide-react';
import { Avatar, buttonClass } from '@/components/ui';
import { Logo, LogoMark } from '@/components/logo';
import { SearchTrigger } from '@/components/search-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { cn } from '@/lib/utils';

type NavUser = { name: string; username: string; avatarUrl: string | null };

const isExplore = (p: string) => p.startsWith('/search') || p.startsWith('/topic');

/* ----------------------------------------------------------- signed out */

/** Visitors' header links beside the logo, from md up. */
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

/* ------------------------------------------------------------ signed in */

/**
 * The signed-in app's navigation. An icon rail from md, a labelled sidebar from
 * xl; every destination is one click away instead of behind the avatar menu.
 */
export function AppSidebar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const profileHref = `/u/${user.username}`;

  const items = [
    { href: '/', label: 'მთავარი', icon: Home, active: pathname === '/' },
    { href: '/search', label: 'აღმოაჩინე', icon: Compass, active: isExplore(pathname) },
    { href: '/bookmarks', label: 'შენახულები', icon: Bookmark, active: pathname.startsWith('/bookmarks') },
    { href: '/dashboard', label: 'პანელი', icon: BarChart3, active: pathname.startsWith('/dashboard') },
    { href: profileHref, label: 'პროფილი', icon: User, active: pathname === profileHref },
  ];

  return (
    <aside className="sticky top-0 hidden h-dvh w-[4.5rem] shrink-0 flex-col self-start border-r border-line bg-surface px-3 py-4 md:flex xl:w-64 xl:px-4">
      <Link href="/" aria-label="Dawere — მთავარი" className="mb-6 flex h-9 items-center justify-center xl:justify-start xl:px-2">
        <LogoMark className="xl:hidden" />
        <Logo className="hidden xl:block" />
      </Link>

      <SearchTrigger variant="field" className="mb-4 hidden xl:flex" />
      <SearchTrigger className="mx-auto mb-2 size-10 xl:hidden" />

      <nav aria-label="მთავარი ნავიგაცია" className="flex flex-col gap-0.5">
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            title={label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex h-10 items-center justify-center gap-3 rounded-lg text-sm font-medium transition-colors xl:justify-start xl:px-3',
              active ? 'bg-hover text-ink' : 'text-muted hover:bg-hover hover:text-ink',
            )}
          >
            <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
            <span className="sr-only xl:not-sr-only">{label}</span>
          </Link>
        ))}
      </nav>

      <Link
        href="/write"
        prefetch={false}
        title="დაწერე"
        className={buttonClass({ variant: 'primary' }, 'mt-5 h-10 w-full px-0 xl:px-3.5')}
      >
        <PenLine />
        <span className="sr-only xl:not-sr-only">დაწერე</span>
      </Link>

      <div className="mt-auto flex flex-col items-center gap-2 border-t border-line pt-4 xl:flex-row xl:gap-1">
        <UserMenu {...user} placement="top" variant="row" className="xl:min-w-0 xl:flex-1" />
        <ThemeToggle />
      </div>
    </aside>
  );
}

/** Phones get a tab bar at the thumb instead of a menu at the top. */
export function MobileNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const profileHref = `/u/${user.username}`;
  const items = [
    { href: '/', label: 'მთავარი', icon: Home, active: pathname === '/' },
    { href: '/search', label: 'ძიება', icon: Compass, active: isExplore(pathname) },
    { href: '/write', label: 'დაწერე', icon: PenLine, active: false, primary: true },
    { href: '/bookmarks', label: 'შენახული', icon: Bookmark, active: pathname.startsWith('/bookmarks') },
  ];
  const onProfile = pathname === profileHref;

  return (
    <nav
      aria-label="მობილური ნავიგაცია"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid h-15 max-w-md grid-cols-5 items-center px-2">
        {items.map(({ href, label, icon: Icon, active, primary }) => (
          <Link
            key={href}
            href={href}
            prefetch={primary ? false : undefined}
            aria-current={active ? 'page' : undefined}
            className="flex flex-col items-center gap-0.5 text-[10.5px] font-medium"
          >
            {primary ? (
              <span className="flex h-8 w-11 items-center justify-center rounded-lg bg-primary text-primary-contrast">
                <Icon className="size-[18px]" />
              </span>
            ) : (
              <span className="flex h-8 items-center">
                <Icon
                  className={cn('size-[21px]', active ? 'text-ink' : 'text-subtle')}
                  strokeWidth={active ? 2.25 : 1.75}
                />
              </span>
            )}
            <span className={active ? 'text-ink' : 'text-subtle'}>{label}</span>
          </Link>
        ))}
        <Link
          href={profileHref}
          aria-current={onProfile ? 'page' : undefined}
          className="flex flex-col items-center gap-0.5 text-[10.5px] font-medium"
        >
          <span className="flex h-8 items-center">
            <Avatar
              name={user.name}
              src={user.avatarUrl}
              size="xs"
              className={cn('size-[22px]', onProfile && 'ring-2 ring-ink ring-offset-1 ring-offset-surface')}
            />
          </span>
          <span className={onProfile ? 'text-ink' : 'text-subtle'}>პროფილი</span>
        </Link>
      </div>
    </nav>
  );
}
