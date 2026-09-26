import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { Landscape } from '@/components/landscape';
import { SUPPORT_EMAIL } from '@/lib/site';
import { cn } from '@/lib/utils';

const delay = (ms: number) => ({ '--rise-delay': `${ms}ms` }) as CSSProperties;

const PILL =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-medium whitespace-nowrap ' +
  'transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.98] [&>svg]:size-[18px]';

/* --------------------------------------------------------------------- hero */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="relative z-10 mx-auto max-w-4xl px-5 pt-20 text-center sm:px-6 sm:pt-28 lg:pt-32">
        <h1 className="headline animate-rise text-[clamp(2.5rem,6.2vw,5rem)] text-ink" style={delay(0)}>
          ქართული ბლოგინგ პლატფორმა
        </h1>
        <p
          className="animate-rise mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-pretty text-muted sm:text-lg"
          style={delay(90)}
        >
          გამოაქვეყნე და წაიკითხე ბლოგები ნებისმიერ თემაზე
        </p>
        <div
          className="animate-rise mx-auto mt-10 flex max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center"
          style={delay(180)}
        >
          <Link href="/signup" className={cn(PILL, 'bg-primary text-primary-contrast shadow-lift hover:bg-primary-hover')}>
            დაიწყე წერა
            <ArrowRight />
          </Link>
          <Link
            href="/search"
            className={cn(PILL, 'border border-line-strong bg-surface/70 text-ink backdrop-blur-sm hover:bg-hover')}
          >
            დათვალიერება
          </Link>
        </div>
      </div>

      {/* The sky's top is the page colour, so the picture can slide up
          behind the buttons without an edge. */}
      <Landscape
        id="hero"
        variant="panorama"
        className="pointer-events-none -mt-[clamp(3rem,9vw,9rem)] h-[clamp(20rem,44vw,46rem)] w-full select-none"
      />
    </section>
  );
}

/* ----------------------------------------------------------------------- faq */

type Question = { q: string; a: string };

function questions(): Question[] {
  const list: Question[] = [
    {
      q: 'რა არის Dawere?',
      a: 'ქართულენოვანი ბლოგების პლატფორმა. აქ შეგიძლია გამოაქვეყნო საკუთარი ტექსტები, წაიკითხო სხვების ნაწერი და გამოიწერო შენთვის საინტერესო ავტორები.',
    },
    {
      q: 'რა ღირს?',
      a: 'არაფერი. ანგარიშის შექმნა, წერა და კითხვა უფასოა, რეკლამას კი საიტზე ვერ ნახავ.',
    },
    {
      q: 'აუცილებელია, რომ ვწერო?',
      a: 'არა. შეგიძლია მხოლოდ კითხულობდე: გამოიწერე ავტორები და შეინახე ტექსტები, რომლებიც მოგეწონა.',
    },
    {
      q: 'როგორ დგება ჩემი ნაკადი?',
      a: 'დასაწყისში საინტერესო თემებს თავად ირჩევ. შემდეგ ნაკადი ითვალისწინებს, რას კითხულობ, იწონებ, ინახავ და ეძებ. ძველი ინტერესები დაახლოებით ორ თვეში თავისით ქრება.',
    },
    {
      q: 'ვინ ხედავს ჩემს მონახაზებს?',
      a: 'მხოლოდ შენ და საიტის ადმინისტრატორები. ტექსტი სხვებისთვის გამოქვეყნების შემდეგ გამოჩნდება, უკვე გამოქვეყნებულში შეტანილი ცვლილებები კი — როცა „განახლებას“ დააჭერ.',
    },
    {
      q: 'რისი ჩასმა შემიძლია ტექსტში?',
      a: 'სათაურების, სიების, ციტატების, ცხრილების, კოდისა და სურათების. მონახაზს „შენახვის“ ღილაკით ან Ctrl+S-ით ინახავ.',
    },
    {
      q: 'ვის ეკუთვნის ჩემი ტექსტები?',
      a: 'შენ. გამოქვეყნებით მხოლოდ იმის უფლებას გვაძლევ, რომ ტექსტი Dawere-ზე ვაჩვენოთ. როცა მას წაშლი, საიტიდანაც ქრება.',
    },
    {
      q: 'როგორ წავშალო ანგარიში?',
      a: 'პარამეტრებიდან, ნებისმიერ დროს. წაშლა შეუქცევადია: მასთან ერთად ქრება პროფილი, ტექსტები, კომენტარები და ატვირთული სურათები.',
    },
  ];
  if (SUPPORT_EMAIL) {
    list.push({
      q: 'პაროლი დამავიწყდა. რა ვქნა?',
      a: `მოგვწერე ${SUPPORT_EMAIL}-ზე იმ მისამართიდან, რომლითაც დარეგისტრირდი, და ახალ პაროლს დაგიყენებთ.`,
    });
  }
  return list;
}

function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto w-full max-w-3xl px-5 pt-12 pb-24 sm:px-6 sm:pt-16 sm:pb-32">
      <div className="text-center">
        <h2 id="faq-title" className="headline text-[clamp(2rem,4.4vw,3.1rem)] text-ink">
          ხშირად დასმული კითხვები
        </h2>
        {SUPPORT_EMAIL ? (
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted">
            პასუხი ვერ იპოვე? მოგვწერე:{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        ) : null}
      </div>

      {/* Closed questions rest on a soft tint; the open one lifts onto paper. */}
      <div className="mt-12 space-y-3 sm:mt-14">
        {questions().map((item) => (
          <details
            key={item.q}
            name="faq"
            className="faq-item group rounded-2xl border border-transparent bg-sunken transition-[background-color,border-color,box-shadow] duration-300 hover:border-line open:border-line open:bg-raised open:shadow-lift"
          >
            <summary className="flex list-none items-center justify-between gap-4 rounded-2xl px-5 py-5 text-[16.5px] leading-snug font-medium text-ink sm:gap-6 sm:px-7 sm:py-6 sm:text-[17px] [&::-webkit-details-marker]:hidden">
              {item.q}
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-muted shadow-soft ring-1 ring-line transition-[transform,background-color,color,box-shadow] duration-300 group-hover:text-ink group-open:rotate-45 group-open:bg-primary group-open:text-primary-contrast group-open:ring-primary"
                aria-hidden
              >
                <Plus className="size-4" />
              </span>
            </summary>
            <p className="-mt-1 px-5 pb-6 text-[15.5px] leading-[1.75] text-pretty text-muted sm:px-7 sm:pr-20 sm:pb-7">
              {item.a}
            </p>
          </details>
        ))}
      </div>

      <div className="mt-12 flex justify-center sm:mt-14">
        <Link href="/signup" className={cn(PILL, 'bg-primary text-primary-contrast shadow-lift hover:bg-primary-hover')}>
          ანგარიშის შექმნა
          <ArrowRight />
        </Link>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- page */

export function Landing({ farewell }: { /** Set right after an account is deleted. */ farewell?: boolean }) {
  return (
    <main className="landing flex-1">
      {farewell ? (
        <p role="status" className="border-b border-line bg-accent-soft px-4 py-3 text-center text-sm text-accent">
          ანგარიში წაიშალა. მადლობა, რომ ჩვენთან იყავი.
        </p>
      ) : null}
      <Hero />
      <Faq />
    </main>
  );
}
