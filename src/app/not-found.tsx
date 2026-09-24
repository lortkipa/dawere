import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Landscape } from '@/components/landscape';
import { Logo } from '@/components/logo';
import { ButtonLink } from '@/components/ui';

/**
 * Without this, `notFound()` and unmatched URLs fall through to the framework's
 * own English 404. Deliberately free of the site header: that reads cookies,
 * which would drag this page out of static rendering for no benefit.
 */
export default function NotFound() {
  return (
    <main className="relative isolate flex w-full flex-1 flex-col overflow-hidden">
      <div className="relative z-10 mx-auto -mb-[clamp(3rem,8vw,8rem)] flex w-full max-w-lg flex-col items-center px-5 pt-16 text-center sm:pt-24">
        <Link href="/" aria-label="Dawere — მთავარი" className="mb-14 inline-flex sm:mb-20">
          <Logo />
        </Link>

        <h1 className="headline animate-rise text-[clamp(2.2rem,5.5vw,3.4rem)] text-ink">გვერდი ვერ მოიძებნა</h1>
        <p className="animate-rise mt-5 text-[16px] leading-relaxed text-muted" style={{ '--rise-delay': '90ms' } as CSSProperties}>
          ბმული შეიძლება ძველი იყოს, ან გვერდი წაიშალა.
        </p>

        <div className="animate-rise mt-10 flex flex-wrap items-center justify-center gap-3" style={{ '--rise-delay': '180ms' } as CSSProperties}>
          <ButtonLink href="/" size="lg">
            მთავარზე
          </ButtonLink>
          <ButtonLink href="/search" size="lg" variant="outline">
            აღმოაჩინე
          </ButtonLink>
        </div>
      </div>

      <Landscape
        id="not-found"
        variant="panorama"
        className="pointer-events-none mt-auto -mb-px h-[clamp(16rem,38vw,34rem)] w-full shrink-0 select-none"
      />
    </main>
  );
}
