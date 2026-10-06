import type { Metadata } from "next";
import Form from "next/form";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthorList, AuthorSkeleton } from "@/components/author-list";
import { EmptyState, PostList } from "@/components/feed";
import { Header } from "@/components/header";
import { Tab } from "@/components/profile";
import { SearchIcon } from "@/components/search-box";
import { FeedSkeleton } from "@/components/skeleton";
import { param, type SearchParams } from "@/lib/admin-list";
import type { User } from "@/lib/db/schema";
import { searchAuthors, searchPosts } from "@/lib/search";
import { getCurrentUser } from "@/lib/session";
import { menuUser } from "@/lib/user-view";

export const metadata: Metadata = { title: "ძიება — dawere" };

const maxQueryLength = 200;

type SearchTab = "posts" | "authors";

// Full search results, for readers and visitors alike. The header's search box leads here.
export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = param(params, "q").slice(0, maxQueryLength);
  const tab: SearchTab = param(params, "tab") === "authors" ? "authors" : "posts";

  const viewer = await getCurrentUser();
  if (viewer && !viewer.onboardedAt) redirect("/onboarding");

  const tabUrl = (value: SearchTab) =>
    `/search?q=${encodeURIComponent(query)}${value === "authors" ? "&tab=authors" : ""}`;

  return (
    <>
      <Header user={viewer ? menuUser(viewer) : undefined} query={query} />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <Form action="/search" role="search" className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <input
            key={query}
            type="search"
            name="q"
            aria-label="ძიება"
            enterKeyHint="search"
            autoComplete="off"
            autoFocus={!query}
            defaultValue={query}
            maxLength={maxQueryLength}
            placeholder="მოძებნე ბლოგები და ავტორები"
            className="h-12 w-full rounded-lg border border-line bg-bg pl-12 pr-4 text-base text-ink outline-offset-0 transition-colors placeholder:text-faint focus:border-ink [&::-webkit-search-cancel-button]:appearance-none"
          />
          {tab === "authors" && <input type="hidden" name="tab" value="authors" />}
        </Form>

        {query ? (
          <section className="mt-8">
            <nav aria-label="შედეგები" className="flex gap-6 border-b border-line">
              <Tab href={tabUrl("posts")} active={tab === "posts"}>
                ბლოგები
              </Tab>
              <Tab href={tabUrl("authors")} active={tab === "authors"}>
                ავტორები
              </Tab>
            </nav>
            {/* Keyed, so a new query or tab starts a fresh list. */}
            <Suspense
              key={`${tab}:${query}`}
              fallback={tab === "authors" ? <AuthorSkeleton /> : <FeedSkeleton />}
            >
              {tab === "authors" ? (
                <AuthorResults viewer={viewer} query={query} />
              ) : (
                <PostResults viewer={viewer} query={query} />
              )}
            </Suspense>
          </section>
        ) : (
          <EmptyState title="მოძებნე ბლოგები და ავტორები" text="ჩაწერე სიტყვა სათაურიდან, თემიდან ან ავტორის სახელიდან." />
        )}
      </main>
    </>
  );
}

const noResults = <EmptyState title="ვერაფერი მოიძებნა" text="სცადე სხვა სიტყვები." />;

async function PostResults({ viewer, query }: { viewer: User | null; query: string }) {
  return (
    <PostList
      first={await searchPosts(viewer, query, null)}
      endpoint={`/api/search/posts?q=${encodeURIComponent(query)}`}
      viewerId={viewer?.id}
      empty={noResults}
    />
  );
}

async function AuthorResults({ viewer, query }: { viewer: User | null; query: string }) {
  return (
    <AuthorList
      first={await searchAuthors(viewer, query, null)}
      endpoint={`/api/search/authors?q=${encodeURIComponent(query)}`}
      viewerId={viewer?.id}
      empty={noResults}
    />
  );
}
