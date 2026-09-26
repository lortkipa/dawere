import Link from 'next/link';
import { PenLine } from 'lucide-react';
import { Logo } from '@/components/logo';
import { HeaderNav, type NavUser } from '@/components/nav-links';
import { NotificationBell } from '@/components/notification-bell';
import { SearchTrigger } from '@/components/search-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { ButtonLink, buttonClass } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * The one navigation bar, on every screen. Visitors get a way in; members get
 * writing, notifications and the account menu, which holds everything else.
 */
export function SiteHeader({ user = null }: { user?: NavUser | null }) {
  return (
    <header className="site-header sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-xl">
      <div className={cn('mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6', user && 'lg:px-10')}>
        <Link href="/" aria-label="Dawere — მთავარი" className="mr-2 shrink-0">
          <Logo />
        </Link>

        <HeaderNav />

        <div className="flex flex-1 items-center justify-end gap-0.5 sm:gap-1.5">
          {user ? (
            <>
              <SearchTrigger variant="field" className="hidden w-60 lg:flex" />
              <SearchTrigger className="lg:hidden" />
              <ButtonLink href="/write" prefetch={false} size="sm" className="mx-1 px-2.5 sm:px-3.5">
                <PenLine />
                <span className="sr-only sm:not-sr-only">დაწერე</span>
              </ButtonLink>
              <NotificationBell initial={user.unread} />
              <ThemeToggle />
              <UserMenu {...user} className="ml-1.5" />
            </>
          ) : (
            <>
              <SearchTrigger />
              <ThemeToggle />
              <Link href="/login" className={buttonClass({ variant: 'ghost', size: 'sm' }, 'px-2 sm:px-3')}>
                შესვლა
              </Link>
              <ButtonLink href="/signup" size="sm">
                დაწყება
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
