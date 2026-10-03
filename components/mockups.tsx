import type { ReactNode } from "react";

/*
  Static pictures of the product built in HTML. `inert` + select-none make them behave
  like an image: nothing inside can be clicked, focused, hovered or selected, and screen
  readers skip them. All mockups show the same sample article, about dawere itself, and its chat
  doubles as a FAQ.
*/

const article = {
  title: "რა არის dawere",
  author: "dawere გუნდი",
  initial: "d",
  minutes: "2 წუთის საკითხავი",
  intro:
    "dawere ქართული ბლოგების პლატფორმაა. აქ ნებისმიერს შეუძლია დაწეროს სტატია და წაიკითხოს სხვების ნაწერი.",
  highlight: "ყველა სტატიას აქვს ჩატი, სადაც ხელოვნურ ინტელექტს შეგიძლია ჰკითხო ის, რაც ტექსტში გაუგებარია.",
  afterHighlight: " პასუხს სტატიის გვერდიდან გაუსვლელად მიიღებ.",
  account: "სტატიის დასაწერად ანგარიში გჭირდება. შეგიძლია შეხვიდე ელფოსტით, Google-ით ან Facebook-ით.",
  startHeading: "როგორ დავიწყო?",
  start: "დააჭირე ღილაკს „დაიწყე წერა“, შექმენი ანგარიში და დაწერე პირველი სტატია.",
};

// Doubles as a FAQ: the questions a visitor would ask about dawere itself.
const chat = [
  {
    question: "რისთვის მჭირდება ეს ჩატი?",
    answer: "თუ სტატიაში რამე გაუგებარია, აქ ჰკითხე. პასუხს სტატიის ტექსტზე დაყრდნობით მიიღებ.",
  },
  {
    question: "შესასვლელად პაროლი მჭირდება?",
    answer: "არა. ელფოსტაზე ერთჯერადი კოდი მოგივა. შეგიძლია Google-ით ან Facebook-ითაც შეხვიდე.",
  },
  {
    question: "ვის შეუძლია სტატიის დაწერა?",
    answer: "ნებისმიერს, ვისაც ანგარიში აქვს.",
  },
];

function Mock({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div inert className={`select-none ${className}`}>
      {children}
    </div>
  );
}

/* Hero, desktop: article with the AI panel docked beside it. */
export function ReadingDesktopMock() {
  return (
    <Mock className="absolute inset-0 flex flex-col bg-white text-ink">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-5">
        <span className="text-[15px] font-extrabold tracking-tight">dawere</span>
        <Avatar initial="ლ" tone="bg-[#e4e2ee]" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-hidden px-6 pt-7 lg:px-12 lg:pt-10">
          <div className="mx-auto max-w-[480px]">
            <ArticleHead />
            <div className="mt-5 space-y-3 text-[13px] leading-relaxed lg:space-y-4 lg:text-[14.5px]">
              <p>{article.intro}</p>
              <p>
                <span className="box-decoration-clone rounded-sm bg-accent-soft">{article.highlight}</span>
                {article.afterHighlight}
              </p>
              <p>{article.account}</p>
              <p className="pt-2 text-[15px] font-bold lg:text-[17px]">{article.startHeading}</p>
              <p>{article.start}</p>
            </div>
          </div>
        </div>
        <div className="flex w-[38%] shrink-0 flex-col border-l border-line">
          <PanelHeader />
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pt-1 pb-4">
            {chat.map((m) => (
              <div key={m.question} className="flex flex-col gap-3">
                <Question>{m.question}</Question>
                <Answer>{m.answer}</Answer>
              </div>
            ))}
          </div>
          <div className="shrink-0 px-4 pb-4">
            <ChatInput />
          </div>
        </div>
      </div>
    </Mock>
  );
}

/* Hero, phone: the same article with the chat as a bottom sheet. */
export function ReadingPhoneMock() {
  return (
    <Mock className="absolute inset-0 bg-white text-ink">
      <div className="px-4 pt-12">
        <div className="flex items-center gap-2 text-muted">
          <ChevronLeft />
          <span className="text-[13px] font-extrabold tracking-tight text-ink">dawere</span>
        </div>
        <p className="mt-4 text-[17px] leading-snug font-extrabold">{article.title}</p>
        <Byline small />
        <p className="mt-3 text-[11.5px] leading-relaxed">{article.intro}</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex h-[58%] flex-col rounded-t-[1.25rem] border-t border-line bg-white px-4 pt-2 shadow-[0_-12px_30px_-14px_rgba(17,17,17,0.25)]">
        <span className="mx-auto h-1 w-9 rounded-full bg-line" />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[12px] font-semibold">ჰკითხე სტატიას</span>
          <Close />
        </div>
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden text-[11.5px]">
          {chat.slice(0, 1).map((m) => (
            <div key={m.question} className="flex flex-col gap-2.5">
              <Question small>{m.question}</Question>
              <Answer small>{m.answer}</Answer>
            </div>
          ))}
        </div>
        <div className="pt-2 pb-6">
          <ChatInput small />
        </div>
      </div>
    </Mock>
  );
}

/* Bento „წერე“: the editor. */
export function EditorMock() {
  return (
    <Mock className="absolute inset-0 overflow-hidden text-ink">
      <div className="flex h-11 items-center justify-between border-b border-line px-4 sm:px-5">
        <div className="flex items-center gap-0.5 text-[13px] text-muted">
          <ToolbarKey className="font-bold">B</ToolbarKey>
          <ToolbarKey className="font-serif italic">I</ToolbarKey>
          <ToolbarKey className="font-semibold">H</ToolbarKey>
          <ToolbarKey className="text-[17px] leading-none">“</ToolbarKey>
          <ToolbarKey>
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
              <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
            </svg>
          </ToolbarKey>
        </div>
        <span className="rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-white">გამოქვეყნება</span>
      </div>
      <div className="px-5 pt-6 sm:px-7">
        <p className="text-[22px] leading-tight font-extrabold sm:text-[26px]">ჩემი პირველი სტატია dawere‑ზე</p>
        <p className="mt-4 text-[14px] leading-relaxed">
          დიდი ხანია მინდოდა ქართულად წერა დამეწყო. თუ მკითხველს ტექსტში რამე გაუგებარი დარჩება, ჩატში იკითხავს.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed">
          დღეს
          <span className="ml-px inline-block h-[1.1em] w-px translate-y-[0.2em] bg-ink" />
        </p>
      </div>
    </Mock>
  );
}

/* Bento „წაიკითხე“: the list of articles. */
export function FeedMock() {
  const posts = [
    { title: article.title, excerpt: "ქართული ბლოგების პლატფორმა და ჩატი, რომელიც სტატიის შესახებ კითხვებს პასუხობს.", minutes: "2 წუთის საკითხავი" },
    { title: "როგორ დავწეროთ პირველი სტატია", excerpt: "ანგარიშის შექმნიდან გამოქვეყნებამდე, ნაბიჯ-ნაბიჯ.", minutes: "4 წუთის საკითხავი" },
    { title: "როგორ მუშაობს AI ჩატი", excerpt: "რას ხედავს ჩატი და როგორ პასუხობს შენს კითხვებს.", minutes: "3 წუთის საკითხავი" },
  ];
  return (
    <Mock className="absolute inset-0 overflow-hidden p-4 text-ink sm:p-5">
      <div className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-[13px] text-muted">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        ძიება
      </div>
      <div className="mt-1 divide-y divide-line">
        {posts.map((p) => (
          <div key={p.title} className="py-4">
            <div className="flex items-center gap-2 text-[12px] text-muted">
              <Avatar initial={article.initial} tone="bg-[#e9e4da]" />
              {article.author}
            </div>
            <p className="mt-2 text-[15px] leading-snug font-bold">{p.title}</p>
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{p.excerpt}</p>
            <p className="mt-2 text-[11px] text-muted">{p.minutes}</p>
          </div>
        ))}
      </div>
    </Mock>
  );
}

/* Bento „ჰკითხე“: a question about a quoted passage, close up. */
export function AskMock() {
  return (
    <Mock className="absolute inset-0 overflow-hidden p-5 text-ink sm:p-6">
      <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md border border-line bg-surface px-4 py-3">
        <p className="border-l-2 border-line pl-3 text-[12.5px] leading-relaxed text-muted">{article.highlight}</p>
        <p className="mt-2 text-[14px]">რა კითხვების დასმა შემიძლია?</p>
      </div>
      <div className="mt-5 max-w-[92%]">
        <AiLabel />
        <p className="mt-1.5 text-[14px] leading-relaxed">
          ნებისმიერის, რომელიც სტატიას ეხება. მაგალითად, სთხოვე ტერმინის ახსნა ან ტექსტის მოკლე შეჯამება.
        </p>
      </div>
      <div className="mt-5">
        <ChatInput />
      </div>
    </Mock>
  );
}

function ArticleHead() {
  return (
    <>
      <p className="text-[22px] leading-snug font-extrabold lg:text-[26px]">{article.title}</p>
      <Byline />
    </>
  );
}

function Byline({ small }: { small?: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-muted ${small ? "mt-2.5 text-[10.5px]" : "mt-4 text-[12px]"}`}>
      <Avatar initial={article.initial} tone="bg-[#e9e4da]" />
      <span className="whitespace-nowrap text-ink">{article.author}</span>
      {!small && (
        <>
          <span>·</span>
          <span>{article.minutes}</span>
        </>
      )}
    </div>
  );
}

function PanelHeader() {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between px-4">
      <span className="text-[13px] font-semibold">ჰკითხე სტატიას</span>
      <Close />
    </div>
  );
}

function Question({ children, small }: { children: ReactNode; small?: boolean }) {
  return (
    <p
      className={`ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-line bg-surface ${
        small ? "px-3 py-2" : "px-3.5 py-2.5 text-[12.5px]"
      }`}
    >
      {children}
    </p>
  );
}

function Answer({ children, small }: { children: ReactNode; small?: boolean }) {
  return (
    <div>
      {!small && <AiLabel />}
      <p className={`leading-relaxed ${small ? "" : "mt-1.5 text-[12.5px]"}`}>{children}</p>
    </div>
  );
}

function AiLabel() {
  return (
    <div className="flex items-center gap-1.5 text-[11.5px] font-semibold">
      <svg viewBox="0 0 24 24" className="size-3.5 text-accent" fill="currentColor" aria-hidden="true">
        <path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z" />
      </svg>
      dawere AI
    </div>
  );
}

function ChatInput({ small }: { small?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-line bg-white text-muted ${
        small ? "h-8 pr-1 pl-3 text-[11px]" : "h-10 pr-1.5 pl-3.5 text-[13px]"
      }`}
    >
      დასვი კითხვა…
      <span className={`grid place-items-center rounded-lg bg-accent text-white ${small ? "size-6" : "size-7"}`}>
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </span>
    </div>
  );
}

function Avatar({ initial, tone }: { initial: string; tone: string }) {
  return (
    <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-ink ${tone}`}>
      {initial}
    </span>
  );
}

function ToolbarKey({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`grid size-7 place-items-center rounded-md ${className}`}>{children}</span>;
}

function Close() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
