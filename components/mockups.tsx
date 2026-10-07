import { Fragment, type ReactNode } from "react";
import { Avatar } from "./avatar";
import { SearchIcon } from "./search-box";

/*
  Static pictures of the product built in HTML. `inert` + select-none make them behave
  like an image: nothing inside can be clicked, focused, hovered or selected, and screen
  readers skip them. All mockups show the same sample article, about dawere itself, and its chat
  doubles as a FAQ.
*/

const article = {
  title: "რა არის dawere",
  description: "ქართული ბლოგების პლატფორმა და ჩატი, რომელიც სტატიის შესახებ კითხვებს პასუხობს.",
  author: "dawere გუნდი",
  initial: "d",
  date: "2 ოქტომბერი, 2026",
  intro:
    "dawere ქართული ბლოგების პლატფორმაა. აქ ნებისმიერს შეუძლია დაწეროს სტატია და წაიკითხოს სხვების ნაწერი.",
  chat: "ყველა სტატიას აქვს ჩატი, სადაც ხელოვნურ ინტელექტს შეგიძლია ჰკითხო ის, რაც ტექსტში გაუგებარია. პასუხს სტატიის გვერდიდან გაუსვლელად მიიღებ.",
  highlight: "ყველა სტატიას აქვს ჩატი, სადაც ხელოვნურ ინტელექტს შეგიძლია ჰკითხო ის, რაც ტექსტში გაუგებარია.",
  account: "სტატიის დასაწერად ანგარიში გჭირდება. შეგიძლია შეხვიდე ელფოსტით, Google-ით ან Facebook-ით.",
  startHeading: "როგორ დავიწყო?",
  start: "დააჭირე ღილაკს „დაიწყე წერა“, შექმენი ანგარიში და დაწერე პირველი სტატია.",
};

// Doubles as a FAQ: the questions a visitor would ask about dawere itself. The real chat shows it
// blurred behind the sign-in card.
export const sampleChat = [
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

/*
  Hero, desktop: a signed-in reader on a post page with the chat docked beside it, as the real
  page looks (Header, PostByline, AskAi), at about 70% scale.
*/
export function ReadingDesktopMock() {
  return (
    <Mock className="absolute inset-0 flex flex-col bg-bg text-ink">
      <SiteHeader />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-hidden px-6 pt-7 lg:px-12 lg:pt-8">
          <div className="mx-auto max-w-[480px]">
            <p className="text-[22px] leading-tight font-extrabold tracking-[-0.015em] lg:text-[26px]">{article.title}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted lg:text-[14px]">{article.description}</p>
            <Byline />
            <div className="mt-5 space-y-3 text-[13px] leading-[1.75] lg:space-y-3.5 lg:text-[13.5px]">
              <p>{article.intro}</p>
              <p>{article.chat}</p>
              <p className="pt-1 text-[16px] leading-[1.3] font-extrabold tracking-[-0.01em] lg:text-[18px]">
                {article.startHeading}
              </p>
              <p>{article.start}</p>
            </div>
          </div>
        </div>
        <div className="flex w-[38%] shrink-0 flex-col border-l border-line">
          <PanelHeader />
          <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-hidden px-4 pt-1 pb-4">
            {sampleChat.map((m) => (
              <Fragment key={m.question}>
                <Question>{m.question}</Question>
                <Answer>{m.answer}</Answer>
              </Fragment>
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

/* Hero, phone: the same page with the chat open as a bottom sheet over the dimmed post. */
export function ReadingPhoneMock() {
  return (
    <Mock className="absolute inset-0 flex flex-col bg-bg pt-11 text-ink">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <SiteHeader small />
        <div className="px-3 pt-4">
          <p className="text-[19px] leading-tight font-extrabold tracking-[-0.015em]">{article.title}</p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{article.description}</p>
          <Byline small />
        </div>
        <span className="absolute inset-x-0 top-10 bottom-0 bg-black/40" />
        <div className="absolute inset-x-0 bottom-0 flex h-[85%] flex-col rounded-t-[1.1rem] bg-bg shadow-[0_-12px_30px_-14px_rgba(17,17,17,0.25)]">
          <div className="flex h-3.5 shrink-0 items-end justify-center">
            <span className="h-1 w-7 rounded-full bg-line" />
          </div>
          <PanelHeader small />
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 pt-0.5 text-[11.5px]">
            {sampleChat.slice(0, 2).map((m) => (
              <Fragment key={m.question}>
                <Question small>{m.question}</Question>
                <Answer small>{m.answer}</Answer>
              </Fragment>
            ))}
          </div>
          <div className="px-3 pt-1 pb-5">
            <ChatInput small />
          </div>
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
              <InitialAvatar initial={article.initial} tone="bg-[color:light-dark(#e9e4da,#3b362d)]" />
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

/* The site header for a signed-in reader: logo, search, „დაწერე“, notifications and avatar. */
function SiteHeader({ small }: { small?: boolean }) {
  const icon = small ? "size-3.5" : "size-4";
  return (
    <div
      className={`flex shrink-0 items-center justify-between border-b border-line bg-bg ${
        small ? "relative z-10 h-10 px-3" : "h-11 px-5"
      }`}
    >
      <span className={`font-extrabold tracking-tight ${small ? "text-[14px]" : "text-[15px]"}`}>dawere</span>
      <div className={`flex items-center ${small ? "gap-1" : "gap-1.5"}`}>
        <span className="grid size-7 place-items-center">
          <SearchIcon className={icon} />
        </span>
        <span className={`flex items-center gap-1.5 px-2 font-medium ${small ? "text-[10.5px]" : "text-[11px]"}`}>
          <PenIcon className={small ? "size-3" : "size-3.5"} />
          დაწერე
        </span>
        <span className="grid size-7 place-items-center">
          <BellIcon className={icon} />
        </span>
        <Avatar className={small ? "ml-0.5 size-5" : "ml-0.5 size-6"} />
      </div>
    </div>
  );
}

/* PostByline: avatar, name over date, the follow button, and the rule under it. */
function Byline({ small }: { small?: boolean }) {
  return (
    <div className={`flex items-center border-b border-line ${small ? "mt-3 gap-2 pb-3" : "mt-4 gap-2.5 pb-4"}`}>
      <Avatar className={small ? "size-7" : "size-8"} />
      <div className="min-w-0 flex-1 leading-snug">
        <p className={`truncate font-medium ${small ? "text-[11px]" : "text-[12.5px]"}`}>{article.author}</p>
        <p className={`text-muted ${small ? "text-[10px]" : "text-[11px]"}`}>{article.date}</p>
      </div>
      <span
        className={`rounded-md bg-accent font-medium text-white ${
          small ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-[11px]"
        }`}
      >
        გამოწერა
      </span>
    </div>
  );
}

/* The chat's title with the new-chat and close buttons, as the panel shows once a question is sent. */
function PanelHeader({ small }: { small?: boolean }) {
  const icon = small ? "size-3.5" : "size-4";
  return (
    <div className={`flex shrink-0 items-center justify-between ${small ? "h-9 pr-1.5 pl-3" : "h-11 pr-2 pl-4"}`}>
      <span className={`font-semibold ${small ? "text-[12px]" : "text-[13px]"}`}>ჰკითხე სტატიას</span>
      <div className="flex items-center gap-0.5 text-muted">
        <span className="grid size-7 place-items-center">
          <NewChatIcon className={icon} />
        </span>
        <span className="grid size-7 place-items-center">
          <Close className={icon} />
        </span>
      </div>
    </div>
  );
}

function Question({ children, small }: { children: ReactNode; small?: boolean }) {
  return (
    <p
      className={`ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-line bg-surface leading-relaxed ${
        small ? "px-3 py-2" : "px-3.5 py-2 text-[12.5px]"
      }`}
    >
      {children}
    </p>
  );
}

// The real chat's answers are plain text, without a label.
function Answer({ children, small }: { children: ReactNode; small?: boolean }) {
  return <p className={`leading-relaxed ${small ? "" : "text-[12.5px]"}`}>{children}</p>;
}

function AiLabel() {
  return (
    <div className="flex items-center gap-1.5 text-[11.5px] font-semibold">
      <SparkleIcon className="size-3.5 text-accent" />
      dawere AI
    </div>
  );
}

export function SparkleIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z" />
    </svg>
  );
}

function ChatInput({ small }: { small?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-line bg-bg text-faint ${
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

function InitialAvatar({ initial, tone }: { initial: string; tone: string }) {
  return (
    <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-ink ${tone}`}>
      {initial}
    </span>
  );
}

function ToolbarKey({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`grid size-7 place-items-center rounded-md ${className}`}>{children}</span>;
}

function Close({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function PenIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}

function BellIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function NewChatIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
      <path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
    </svg>
  );
}
