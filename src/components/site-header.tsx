import Link from 'next/link';
import { Logo } from '@/components/logo';
import { HeaderNav } from '@/components/nav-links';
import { SearchTrigger } from '@/components/search-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { ButtonLink, buttonClass } from '@/components/ui';

/** Visitors' header: the wordmark, one way to browse, and the way in. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href="/" aria-label="Dawere — მთავარი" className="mr-2 shrink-0">
          <Logo />
        </Link>

        <HeaderNav />

        <div className="flex flex-1 items-center justify-end gap-0.5 sm:gap-1.5">
          <SearchTrigger />
          <ThemeToggle />
          <Link href="/login" className={buttonClass({ variant: 'ghost', size: 'sm' }, 'px-2 sm:px-3')}>
            შესვლა
          </Link>
          <ButtonLink href="/signup" size="sm">
            დაწყება
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

/** Signed-in phones: the sidebar is hidden, so the essentials sit up here. */
export function MobileTopBar({ user }: { user: { name: string; username: string; avatarUrl: string | null } }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-xl md:hidden">
      <div className="flex h-14 items-center gap-1 px-4">
        <Link href="/" aria-label="Dawere — მთავარი" className="mr-auto">
          <Logo />
        </Link>
        <SearchTrigger />
        <ThemeToggle />
        <div className="ml-1.5">
          <UserMenu {...user} />
        </div>
      </div>
    </header>
  );
}
