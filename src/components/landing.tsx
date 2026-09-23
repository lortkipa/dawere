import type { CSSProperties } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bold,
  Check,
  Code,
  Heading2,
  ImageIcon,
  Italic,
  List,
  PenLine,
  Plus,
  Quote,
  Search,
  Sparkles,
} from 'lucide-react';
import { ButtonLink } from '@/components/ui';
import { cn } from '@/lib/utils';

type Topic = { id: string; slug: string; name: string };

const delay = (ms: number) => ({ '--rise-delay': `${ms}ms` }) as CSSProperties;

/* --------------------------------------------------------------------- hero */

const TOOLBAR = [Heading2, Bold, Italic, List, Quote, Code, ImageIcon];

/**
 * The editor mid-sentence: what a new account actually gets. Deliberately no
 * made-up posts, authors or like counts — the platform is young, and the cover
 * should not pretend otherwise. Decorative, so hidden from assistive tech.
 */
function EditorPreview() {
  return (
    <div className="relative mx-auto max-w-3xl" aria-hidden>
      <div className="overflow-hidden rounded-xl border border-line bg-raised shadow-lift">
        <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </div>
          <span className="rounded-md bg-sunken px-2 py-0.5 text-[11px] font-medium text-muted">მონახაზი</span>
          <span className="hidden items-center gap-1 text-[11px] text-subtle sm:inline-flex">
            <Check className="size-3" />
            შენახულია
          </span>
          <span className="ml-auto rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-contrast">
            გამოქვეყნება
          </span>
        </div>

        <div className="flex items-center gap-0.5 border-b border-line px-3 py-1.5 text-muted">
          {TOOLBAR.map((Icon, index) => (
            <span
              key={index}
              className={cn('flex size-7 items-center justify-center rounded-md', index === 0 && 'bg-hover text-ink')}
            >
              <Icon className="size-3.5" />
            </span>
          ))}
        </div>

        <div className="px-6 pt-7 pb-9 text-left sm:px-12 sm:pt-10 sm:pb-12">
          <p className="text-[1.5rem] leading-snug font-bold tracking-tight text-ink sm:text-[1.9rem]">
            ზაფხული, რომელიც მთაში გავატარე
          </p>
          <p className="mt-2 text-[15px] text-subtle sm:text-base">რა მასწავლა ორმა კვირამ ინტერნეტის გარეშე</p>
          <p className="mt-6 font-serif text-[15px] leading-relaxed text-muted sm:text-[17px]">
            უშგულში ღამით ისეთი სიჩუმეა, რომ საკუთარი ფიქრები ხმამაღლა გესმის. პირველივე დღეს ტელეფონი ჩანთის
            ფსკერზე ჩავდე და
            <span className="animate-caret ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-accent" />
          </p>
        </div>
      </div>
      {/* The window sinks into the page instead of ending on a hard edge. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface to-transparent" />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-6 text-center sm:px-6 sm:pt-24 lg:pt-28">
        <p
          className="animate-rise mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-raised px-3 py-1 text-[13px] text-muted shadow-soft"
          style={delay(0)}
        >
          <span className="size-1.5 rounded-full bg-accent" />
          ქართულად წერისა და კითხვის სივრცე
        </p>

        <h1
          className="animate-rise mx-auto mt-6 max-w-3xl text-[2.4rem] leading-[1.1] font-bold tracking-tight text-ink sm:text-6xl lg:text-[4.25rem]"
          style={delay(40)}
        >
          ადგილი, სადაც ტექსტი მთავარია.
        </h1>

        <p
          className="animate-rise mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-muted sm:text-lg"
          style={delay(80)}
        >
          გამოაქვეყნე შენი ნაწერი და აღმოაჩინე ავტორები, რომლებსაც ბოლომდე წაიკითხავ.
        </p>

        <div
          className="animate-rise mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
          style={delay(120)}
        >
          <ButtonLink href="/signup" size="lg">
            დაიწყე უფასოდ
            <ArrowRight />
          </ButtonLink>
          <ButtonLink href="/search" size="lg" variant="outline">
            დათვალიერება
          </ButtonLink>
        </div>

        <div className="animate-rise mt-16 sm:mt-20" style={delay(180)}>
          <EditorPreview />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ features */

const FEATURES = [
  {
    icon: PenLine,
    title: 'რედაქტორი, რომელიც ხელს არ გიშლის',
    text: 'სათაურები, სიები, ცხრილები, კოდი და სურათები. ყველაფერი ავტომატურად ინახება, გამოქვეყნებამდე კი მონახაზს მხოლოდ შენ ხედავ.',
  },
  {
    icon: Sparkles,
    title: 'ნაკადი, რომელიც შენს გემოვნებას სწავლობს',
    text: 'ყოველი წაკითხვა, მოწონება და შენახვა ნაკადს აზუსტებს — ძველი ინტერესები თანდათან ქრება, ახალი წინ იწევს.',
  },
  {
    icon: Search,
    title: 'ძიება, რომელსაც ქართული ესმის',
    text: 'ბრუნვები, ბეჭდვის შეცდომები და ზუსტი ფრაზები. შედეგები სიტყვის დასრულებამდე ჩნდება.',
  },
  {
    icon: BarChart3,
    title: 'ნახე, რა მუშაობს',
    text: 'ნახვები, მოწონებები, კომენტარები და გამომწერები — 30 დღის სტატისტიკა ყველა ტექსტზე.',
  },
];

function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="max-w-2xl">
        <h2 className="text-3xl leading-tight font-bold tracking-tight text-ink sm:text-4xl">
          ყველაფერი, რაც წერასა და კითხვას სჭირდება
        </h2>
        <p className="mt-4 text-[17px] leading-relaxed text-muted">და არაფერი ზედმეტი.</p>
      </div>

      <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="bg-surface p-6 sm:p-7">
            <span className="flex size-9 items-center justify-center rounded-lg border border-line bg-sunken text-ink">
              <Icon className="size-[18px]" />
            </span>
            <h3 className="mt-5 text-[15px] leading-snug font-semibold text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- topics */

function Topics({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) return null;
  return (
    <section className="border-y border-line bg-sunken">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">რაზე წერენ</h2>
          <Link
            href="/search"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            ყველა თემა
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <ul className="mt-8 flex flex-wrap gap-2">
          {topics.map((topic) => (
            <li key={topic.id}>
              <Link
                href={`/topic/${topic.slug}`}
                className="inline-flex h-9 items-center rounded-full border border-line bg-raised px-4 text-sm font-medium text-ink shadow-soft transition-colors hover:border-line-strong hover:bg-hover"
              >
                {topic.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------- faq */

const FAQ = [
  {
    q: 'რა არის Dawere?',
    a: 'ადგილი, სადაც ქართულად წერენ და კითხულობენ. გამოაქვეყნე ტექსტი, გამოიწერე ავტორები და მიიღე ნაკადი, რომელიც შენს ინტერესებს ერგება.',
  },
  {
    q: 'უფასოა?',
    a: 'დიახ. ანგარიშის შექმნა, წერა და კითხვა არაფერი ღირს.',
  },
  {
    q: 'როგორ დგება ჩემი ნაკადი?',
    a: 'იმის მიხედვით, რასაც კითხულობ, იწონებ, ინახავ და ეძებ. დასაწყისში თემებს თავად ირჩევ, შემდეგ ნაკადი თანდათან ზუსტდება.',
  },
  {
    q: 'რა შემიძლია დავწერო?',
    a: 'სათაურები, სიები, ცხრილები, ციტატები, კოდის ბლოკები და სურათები. ტექსტი ავტომატურად ინახება წერისას.',
  },
  {
    q: 'ვინ ხედავს მონახაზს?',
    a: 'მხოლოდ შენ. სანამ არ გამოაქვეყნებ, ტექსტს ვერავინ ნახავს. გამოქვეყნებულ ტექსტში ცვლილებებიც მხოლოდ „განახლებაზე“ დაჭერის შემდეგ ჩანს.',
  },
  {
    q: 'აუცილებელია წერა?',
    a: 'არა. შეგიძლია მხოლოდ კითხულობდე — გამოიწერე ავტორები და შეინახე ის, რაც მოგეწონა.',
  },
];

function Faq() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">ხშირი კითხვები</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">მოკლე პასუხები იმაზე, რასაც ყველაზე ხშირად გვეკითხებიან.</p>
      </div>

      <div className="border-t border-line">
        {FAQ.map((item) => (
          <details key={item.q} className="group border-b border-line">
            <summary className="flex list-none items-center justify-between gap-5 py-5 text-base font-medium text-ink [&::-webkit-details-marker]:hidden">
              {item.q}
              <Plus
                className="size-4 shrink-0 text-subtle transition-transform duration-200 group-open:rotate-45"
                aria-hidden
              />
            </summary>
            <p className="-mt-1 pb-5 text-[15px] leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ closing */

function Closing() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="rounded-2xl border border-line bg-sunken px-6 py-14 text-center sm:px-12 sm:py-20">
        <h2 className="mx-auto max-w-xl text-3xl leading-tight font-bold tracking-tight text-ink sm:text-[2.5rem]">
          შენი პირველი ტექსტი ერთ ღილაკზეა.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[15px] text-muted">
          ანგარიშის შექმნას ერთი წუთი სჭირდება. დანარჩენი შენზეა.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <ButtonLink href="/signup" size="lg">
            ანგარიშის შექმნა
            <ArrowRight />
          </ButtonLink>
          <ButtonLink href="/login" size="lg" variant="ghost">
            უკვე მაქვს ანგარიში
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- page */

export function Landing({
  topics,
  farewell,
}: {
  topics: Topic[];
  /** Set right after an account is deleted. */
  farewell?: boolean;
}) {
  return (
    <main className="flex-1">
      {farewell ? (
        <p role="status" className="border-b border-line bg-accent-soft px-4 py-3 text-center text-sm text-accent">
          ანგარიში წაიშალა. მადლობა, რომ ჩვენთან იყავი.
        </p>
      ) : null}
      <Hero />
      <Features />
      <Topics topics={topics} />
      <Faq />
      <Closing />
    </main>
  );
}
