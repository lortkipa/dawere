import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Landscape } from '@/components/landscape';
import { Logo } from '@/components/logo';
import { ParallaxScene } from '@/components/parallax-scene';
import { ThemeToggle } from '@/components/theme-toggle';

export default async function AuthLayout({ children }: LayoutProps<'/'>) {
  // Nobody signed in should be looking at the sign-in screen.
  if (await getCurrentUser()) redirect('/');

  // The layout outlives the switch between sign-in and sign-up, so the
  // picture stays put while the form changes beside it.
  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-[minmax(28rem,1fr)_minmax(0,1.12fr)]">
      <div className="flex min-w-0 flex-col">
        <header className="flex h-16 items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Dawere — მთავარი">
            <Logo />
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex flex-1 flex-col justify-center px-5 pt-8 pb-12 sm:px-8 sm:pt-12 lg:pb-20">
          <div className="mx-auto w-full max-w-[23.5rem]">{children}</div>
        </main>

        {/* Phones and tablets get the range as a strip under the form. */}
        <Landscape id="auth-strip" variant="panorama" className="pointer-events-none h-40 w-full sm:h-52 lg:hidden" />
      </div>

      <aside className="sticky top-0 hidden h-dvh p-3 pl-0 lg:block">
        <ParallaxScene className="grain h-full overflow-hidden rounded-[28px] ring-1 ring-line">
          <Landscape id="auth" variant="lake" className="absolute inset-0 h-full w-full" />
        </ParallaxScene>
      </aside>
    </div>
  );
}
