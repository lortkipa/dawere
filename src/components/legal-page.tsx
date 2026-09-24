import type { ReactNode } from 'react';

/** Shared frame for the terms and the privacy policy: article typography, a little smaller. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[42rem] flex-1 px-4 pt-14 pb-24 sm:px-6 sm:pt-24">
      <header className="animate-rise text-center">
        <h1 className="headline text-[2.2rem] text-ink sm:text-[3rem]">{title}</h1>
        <p className="mt-4 text-sm text-subtle">ბოლო განახლება: {updated}</p>
      </header>
      <div className="article mt-14 border-t border-line pt-10 font-sans text-[16px] leading-relaxed sm:mt-16 [&_h2]:font-serif [&_h2]:text-[1.4rem] [&_h2]:font-semibold">
        {children}
      </div>
    </main>
  );
}
