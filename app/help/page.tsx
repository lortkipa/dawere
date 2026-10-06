import type { Metadata } from "next";
import Link from "next/link";
import { DialogArt } from "@/components/dialog-art";
import { SupportLine } from "@/components/help";
import { HelpSearch } from "@/components/help-search";
import { OpenPage } from "@/components/legal-page";
import { getHelpTopics } from "@/lib/help";

export const metadata: Metadata = { title: "დახმარება — dawere" };

// A search box over a grid of topics. Admins write the topics as one document on /admin/legal;
// each of its headings becomes a card here.
export default async function HelpPage() {
  const topics = await getHelpTopics();

  return (
    <OpenPage>
      <main className="px-4 pb-20 sm:px-6">
        <section className="relative mx-auto max-w-6xl pt-12 text-center sm:pt-20">
          <DialogArt name="help" className="absolute bottom-0 left-0 hidden w-64 xl:block" />
          <DialogArt name="comment" className="absolute bottom-0 right-0 hidden w-64 xl:block" />
          <h1 className="text-[clamp(1.75rem,5vw,2.5rem)] leading-tight font-extrabold tracking-[-0.015em]">
            რით დაგეხმაროთ?
          </h1>
          <div className="relative z-10 mx-auto mt-7 max-w-xl pb-6 xl:pb-12">
            <HelpSearch topics={topics.map(({ slug, title, text }) => ({ slug, title, text }))} />
          </div>
        </section>

        <ul className="mx-auto mt-2 grid max-w-3xl grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-4 xl:mt-4">
          {topics.map((topic) => (
            <li key={topic.slug}>
              <Link
                href={`/help/${topic.slug}`}
                className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-bg transition hover:border-fainter hover:shadow-sm"
              >
                <span className="flex h-24 justify-center bg-accent-soft">
                  <DialogArt name={topic.art} className="h-full" />
                </span>
                <span className="px-3 py-3.5 text-center text-[15px] font-medium text-balance">{topic.title}</span>
              </Link>
            </li>
          ))}
        </ul>

        <SupportLine />
      </main>
    </OpenPage>
  );
}
