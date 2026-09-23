import type { ReactNode } from 'react';

/** Shared frame for the terms and the privacy policy: article typography, a little smaller. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[42rem] flex-1 px-4 pt-10 pb-20 sm:px-6 sm:pt-16">
      <p className="text-[13px] text-subtle">ბოლო განახლება: {updated}</p>
      <h1 className="mt-2 text-[2rem] leading-tight font-bold tracking-tight text-ink sm:text-[2.4rem]">
        {title}
      </h1>
      <div className="article mt-10 font-sans text-[16px] leading-relaxed [&_h2]:text-[1.25rem]">{children}</div>
    </main>
  );
}
