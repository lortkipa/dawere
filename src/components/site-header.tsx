import Link from 'next/link';
import { PenLine, Search } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { Logo } from '@/components/logo';
import { HeaderNav } from '@/components/nav-links';
import { SearchBox } from '@/components/search-box';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { ButtonLink, buttonClass } from '@/components/ui';

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <Link href="/" aria-label="Dawere — მთავარი" className="shrink-0">
          <Logo />
        </Link>

        <HeaderNav />

        <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-2">
          {/* Signed-out visitors land on the cover page; a search field there
              would compete with it, so the header offers a plain link instead. */}
          {user ? <SearchBox className="hidden w-full max-w-xs md:block" /> : null}

          <Link
            href="/search"
            aria-label="ძიება"
            className={buttonClass({ variant: 'ghost', size: 'icon' }, 'size-9 md:hidden')}
          >
            <Search />
          </Link>

          <ThemeToggle />

          {user ? (
            <>
              <Link
                href="/write"
                prefetch={false}
                className={buttonClass({ variant: 'outline', size: 'sm' }, 'hidden md:inline-flex')}
              >
                <PenLine />
                დაწერე
              </Link>
              <div className="ml-1">
                <UserMenu name={user.name} username={user.username} avatarUrl={user.avatarUrl} />
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={buttonClass({ variant: 'ghost', size: 'sm' }, 'hidden sm:inline-flex')}
              >
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
