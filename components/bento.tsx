import type { ReactNode } from "react";
import { AskMock, EditorMock, FeedMock } from "./mockups";

export function Bento() {
  return (
    <section className="mx-auto max-w-5xl px-4 pt-24 sm:px-6 sm:pt-32">
      <h2 className="sr-only">შესაძლებლობები</h2>
      <div className="grid gap-4 md:grid-cols-5">
        <TopCard
          className="md:col-span-3"
          title="წერე"
          text="დაწერე და გამოაქვეყნე საკუთარი სტატიები."
          mock={<EditorMock />}
        />
        <TopCard
          className="md:col-span-2"
          title="წაიკითხე"
          text="იპოვე და წაიკითხე სხვა ავტორების სტატიები."
          mock={<FeedMock />}
        />

        <div className="grid overflow-hidden rounded-3xl bg-surface md:col-span-5 md:grid-cols-5">
          <div className="px-6 pt-7 sm:px-8 sm:pt-8 md:col-span-2 md:self-center md:pb-8">
            <CardText title="ჰკითხე" text="დასვი კითხვები სტატიის შესახებ." />
          </div>
          <div className="relative mt-8 ml-6 min-h-80 overflow-hidden rounded-tl-2xl border-t border-l border-line bg-bg sm:ml-8 md:col-span-3 md:mt-10 md:ml-0">
            <AskMock />
          </div>
        </div>
      </div>
    </section>
  );
}

function TopCard({ className, title, text, mock }: { className: string; title: string; text: string; mock: ReactNode }) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-3xl bg-surface px-6 pt-7 sm:px-8 sm:pt-8 ${className}`}>
      {/* Fixed text height keeps both image panels aligned when one line wraps. */}
      <div className="md:min-h-30">
        <CardText title={title} text={text} />
      </div>
      <div className="relative mt-8 min-h-72 flex-1 overflow-hidden rounded-t-2xl border border-b-0 border-line bg-bg">
        {mock}
      </div>
    </div>
  );
}

function CardText({ title, text }: { title: string; text: string }) {
  return (
    <>
      <h3 className="text-3xl font-extrabold tracking-[-0.015em] sm:text-4xl">{title}</h3>
      <p className="mt-3 text-[17px] leading-relaxed text-muted">{text}</p>
    </>
  );
}
