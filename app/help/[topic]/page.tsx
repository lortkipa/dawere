import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SupportLine } from "@/components/help";
import { OpenPage } from "@/components/legal-page";
import { getHelpTopics } from "@/lib/help";
import { legalExtensions } from "@/lib/legal-schema";

type Props = { params: Promise<{ topic: string }> };

async function findTopic(params: Props["params"]) {
  const { topic: slug } = await params;
  const topics = await getHelpTopics();
  // Georgian slugs may still arrive percent-encoded.
  let wanted = slug;
  try {
    wanted = decodeURIComponent(slug);
  } catch {}
  return { topic: topics.find((topic) => topic.slug === wanted), topics };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic } = await findTopic(params);
  return { title: `${topic?.title ?? "დახმარება"} — dawere` };
}

export default async function HelpTopicPage({ params }: Props) {
  const { topic, topics } = await findTopic(params);
  if (!topic) notFound();
  const others = topics.filter((other) => other.slug !== topic.slug);

  return (
    <OpenPage>
      <main className="px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        <article className="mx-auto max-w-2xl">
          <Link href="/help" className="inline-flex items-center gap-1.5 text-[15px] text-muted transition-colors hover:text-ink">
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            დახმარება
          </Link>
          <h1 className="mt-4 text-[clamp(1.5rem,6vw,2.25rem)] leading-tight font-extrabold tracking-[-0.015em] text-balance break-words">
            {topic.title}
          </h1>
          <div className="post-body mt-6">
            {renderToReactElement({ content: { type: "doc", content: topic.content }, extensions: legalExtensions })}
          </div>

          {others.length > 0 && (
            <nav aria-labelledby="other-topics" className="mt-14">
              <h2 id="other-topics" className="text-lg font-semibold">
                სხვა თემები
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {others.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/help/${other.slug}`}
                      className="inline-flex h-10 items-center rounded-full border border-line px-4 text-[15px] transition-colors hover:bg-surface"
                    >
                      {other.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </article>

        <SupportLine />
      </main>
    </OpenPage>
  );
}
