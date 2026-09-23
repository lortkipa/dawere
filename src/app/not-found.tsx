import Link from 'next/link';
import { Logo } from '@/components/logo';
import { ButtonLink } from '@/components/ui';

/**
 * Without this, `notFound()` and unmatched URLs fall through to the framework's
 * own English 404. Deliberately free of the site header: that reads cookies,
 * which would drag this page out of static rendering for no benefit.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-20 text-center">
      <Link href="/" className="mx-auto mb-12 inline-flex">
        <Logo />
      </Link>

      <p className="font-serif text-6xl font-semibold text-subtle">404</p>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">გვერდი ვერ მოიძებნა</h1>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href="/">მთავარზე</ButtonLink>
        <ButtonLink href="/search" variant="outline">
          ძიება
        </ButtonLink>
      </div>
    </main>
  );
}
