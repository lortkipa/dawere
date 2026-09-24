'use client';

import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui';

/**
 * Something threw while rendering a page. The header and footer stay put (they
 * live in the layout above this boundary), so the reader is never stranded.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-5 py-24 text-center">
      <h1 className="headline animate-rise text-[clamp(2rem,5vw,3rem)] text-ink">რაღაც არასწორად წავიდა</h1>
      <p className="mt-5 text-[16px] leading-relaxed text-pretty text-muted">
        გვერდი ვერ ჩაიტვირთა. სცადე თავიდან — თუ პრობლემა განმეორდა, რამდენიმე წუთში დაბრუნდი.
      </p>
      {error.digest ? <p className="mt-4 font-mono text-[12px] text-subtle">კოდი: {error.digest}</p> : null}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={() => retry()}>
          <RotateCcw />
          თავიდან ცდა
        </Button>
        <ButtonLink href="/" size="lg" variant="outline">
          მთავარზე
        </ButtonLink>
      </div>
    </main>
  );
}
