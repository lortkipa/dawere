import type { CSSProperties } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Bold,
  CloudCheck,
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
import { topicEmoji } from '@/lib/topic-art';
import { cn } from '@/lib/utils';

type Topic = { id: string; slug: string; name: string };

const delay = (ms: number) => ({ '--rise-delay': `${ms}ms` }) as CSSProperties;

/* --------------------------------------------------------------------- cover */

const TOOLBAR = [Bold, Italic, Heading2, List, Quote, Code, ImageIcon];
const PREVIEW_TOPICS = [
  ['travel', 'მოგზაურობა'],
  ['writing', 'წერა'],
] as const;

/**
 * The editor mid-sentence: what a new account actually gets. Deliberately no
 * made-up posts, authors or like counts — the platform is young, and the cover
 * should not pretend otherwise. Decorative, so hidden from assistive tech.
 */
function EditorPreview() {
  return (
    <div className="relative h-[26rem] w-[26rem]" aria-hidden>
      <div
        className="animate-rise absolute top-2 right-0 w-[24rem] rotate-[1.5deg] overflow-hidden rounded-2xl border border-line bg-raised shadow-lift"
        style={delay(120)}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <span className="rounded-full bg-sunken px-2.5 py-0.5 text-[11px] font-medium text-muted">მონახაზი</span>
          <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-contrast">
            გამოქვეყნება
          </span>
        </div>

        <div className="flex items-center gap-0.5 border-b border-line bg-sunken/60 px-3 py-1.5 text-muted">
          {TOOLBAR.map((Icon) => (
            <span
              key={Icon.displayName}
              className={cn(
                'flex size-7 items-center justify-center rounded-md',
                Icon === Heading2 && 'bg-raised text-ink shadow-sm',
              )}
            >
              <Icon className="size-3.5" />
            </span>
          ))}
        </div>

        <div className="px-6 pt-5 pb-6">
          <p className="font-serif text-[1.35rem] leading-snug font-bold text-ink">ზაფხული, რომელიც მთაში გავატარე</p>
          <p className="mt-1.5 text-[13px] text-subtle">რა მასწავლა ორმა კვირამ ინტერნეტის გარეშე</p>
          <p className="mt-4 font-serif text-[14px] leading-relaxed text-muted">
            უშგულში ღამით ისეთი სიჩუმეა, რომ საკუთარი ფიქრები ხმამაღლა გესმის. პირველივე დღეს ტელეფონი ჩანთის
            ფსკერზე ჩავდე და
            <span className="animate-caret ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-accent" />
          </p>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {PREVIEW_TOPICS.map(([slug, name]) => (
              <span
                key={slug}
                className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent"
              >
                <span>{topicEmoji(slug)}</span>
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        className="animate-rise absolute -bottom-3 -left-2 flex -rotate-3 items-center gap-2 rounded-xl border border-line bg-raised px-3.5 py-2.5 text-[13px] font-medium text-ink shadow-lift"
        style={delay(260)}
      >
        <CloudCheck className="size-4 text-accent" />
        ავტომატურად შეინახა
      </div>
    </div>
  );
}

function Cover() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div
        className="dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute -top-40 right-0 size-[34rem] rounded-full bg-accent-soft opacity-70 blur-3xl" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-6 sm:py-28 lg:grid-cols-[minmax(0,1fr)_26rem] lg:py-32">
        <div className="text-center lg:text-left">
          <h1
            className="animate-rise font-serif text-[2.6rem] leading-[1.08] font-bold text-ink sm:text-6xl lg:text-[4.1rem]"
            style={delay(40)}
          >
            ადგილი, სადაც
            <br />
            <span className="text-accent">ტექსტი</span> მთავარია.
          </h1>

          <p
            className="animate-rise mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-muted lg:mx-0"
            style={delay(80)}
          >
            გამოაქვეყნე შენი ნაწერი და აღმოაჩინე ავტორები, რომლებსაც ბოლომდე წაიკითხავ.
          </p>

          <div
            className="animate-rise mt-10 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
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
        </div>

        <div className="hidden justify-self-end lg:block">
          <EditorPreview />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ topic carousel */

function TopicDrift({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) return null;
  // The list is rendered twice so the -50% drift loops without a visible seam.
  const strip = [...topics, ...topics];

  return (
    <section className="overflow-hidden border-b border-line bg-sunken py-6" aria-label="თემები">
      <div className="animate-drift flex w-max gap-3 hover:[animation-play-state:paused]">
        {strip.map((topic, index) => (
          <Link
            key={`${topic.id}-${index}`}
            href={`/topic/${topic.slug}`}
            aria-hidden={index >= topics.length}
            tabIndex={index >= topics.length ? -1 : undefined}
            className="flex shrink-0 items-center gap-2.5 rounded-full border border-line bg-raised px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent/40 hover:text-accent"
          >
            <span className="text-base leading-none" aria-hidden>
              {topicEmoji(topic.slug)}
            </span>
            {topic.name}
          </Link>
        ))}
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
    <section className="border-y border-line bg-sunken">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <h2 className="mx-auto max-w-2xl text-center font-serif text-3xl font-bold text-ink sm:text-4xl">
          ყველაფერი, რაც წერასა და კითხვას სჭირდება
        </h2>
        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl border border-line bg-raised p-7 shadow-soft">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
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
    <section className="mx-auto max-w-3xl px-5 pb-24 sm:px-6">
      <h2 className="mb-10 text-center font-serif text-3xl font-bold text-ink sm:text-4xl">ხშირი კითხვები</h2>

      <div className="border-t border-line">
        {FAQ.map((item) => (
          <details key={item.q} className="group border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-[17px] font-medium text-ink transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
              {item.q}
              <Plus
                className="size-5 shrink-0 text-subtle transition-transform duration-200 group-open:rotate-45"
                aria-hidden
              />
            </summary>
            <p className="pb-5 text-[15px] leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ closing */

function Closing() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-primary px-7 py-16 text-center sm:px-12 sm:py-20">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-15" aria-hidden />
        <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-accent/30 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-accent/20 blur-3xl" aria-hidden />

        <div className="relative">
          <h2 className="mx-auto max-w-xl font-serif text-3xl leading-tight font-bold text-primary-contrast sm:text-[2.6rem]">
            შენი პირველი ტექსტი ერთ ღილაკზეა.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-primary-contrast/70">
            ანგარიშის შექმნას ერთი წუთი სჭირდება. დანარჩენი შენზეა.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/signup" size="lg" variant="accent">
              ანგარიშის შექმნა
              <ArrowRight />
            </ButtonLink>
            <ButtonLink
              href="/login"
              size="lg"
              variant="ghost"
              className="text-primary-contrast/80 hover:bg-white/10 hover:text-primary-contrast dark:hover:bg-black/10"
            >
              შესვლა
            </ButtonLink>
          </div>
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
        <p role="status" className="border-b border-line bg-accent-soft px-5 py-3 text-center text-sm text-accent">
          ანგარიში წაიშალა. მადლობა, რომ ჩვენთან იყავი.
        </p>
      ) : null}
      <Cover />
      <TopicDrift topics={topics} />
      <Features />
      <Faq />
      <Closing />
    </main>
  );
}
