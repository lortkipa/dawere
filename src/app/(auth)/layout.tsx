import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';

export default async function AuthLayout({ children }: LayoutProps<'/'>) {
  // Nobody signed in should be looking at the sign-in screen.
  if (await getCurrentUser()) redirect('/');

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col">
      <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />

      <header className="relative flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Dawere — მთავარი">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-[25rem] sm:rounded-2xl sm:border sm:border-line sm:bg-raised sm:p-9 sm:shadow-lift">
          {children}
        </div>
      </main>
    </div>
  );
}
