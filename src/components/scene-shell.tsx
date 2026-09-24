import type { ReactNode } from 'react';
import Link from 'next/link';
import { Landscape } from '@/components/landscape';
import { Logo } from '@/components/logo';
import { ParallaxScene } from '@/components/parallax-scene';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

/**
 * The frame for sign-in, sign-up and onboarding: the page's content on the
 * left, the lake landscape in a rounded panel on the right (lg+), and a strip
 * of the range under the content on smaller screens.
 */
export function SceneShell({
  children,
  wide = false,
  className,
}: {
  children: ReactNode;
  /** Onboarding's option lists need more room than a two-field form. */
  wide?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid min-h-dvh flex-1',
        wide
          ? 'lg:grid-cols-[minmax(34rem,1.2fr)_minmax(0,1fr)]'
          : 'lg:grid-cols-[minmax(28rem,1fr)_minmax(0,1.12fr)]',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col">
        <header className="flex h-16 items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Dawere — მთავარი">
            <Logo />
          </Link>
          <ThemeToggle />
        </header>

        {/* Onboarding's steps differ in height; anchoring them to the top keeps
            the progress bar and heading from jumping as they change. */}
        <main
          className={cn(
            'flex flex-1 flex-col px-5 pt-8 pb-12 sm:px-8 sm:pt-12 lg:pb-20',
            wide ? 'lg:pt-[max(3rem,13vh)]' : 'justify-center',
          )}
        >
          <div className={cn('mx-auto w-full', wide ? 'max-w-[33rem]' : 'max-w-[23.5rem]')}>{children}</div>
        </main>

        <Landscape id="scene-strip" variant="panorama" className="pointer-events-none h-40 w-full sm:h-52 lg:hidden" />
      </div>

      <aside className="sticky top-0 hidden h-dvh p-3 pl-0 lg:block">
        <ParallaxScene className="grain h-full overflow-hidden rounded-[28px] ring-1 ring-line">
          <Landscape id="scene" variant="lake" className="absolute inset-0 h-full w-full" />
        </ParallaxScene>
      </aside>
    </div>
  );
}
