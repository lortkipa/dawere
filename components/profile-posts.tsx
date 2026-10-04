"use client";

import Link from "next/link";
import type { Page, ProfilePost } from "@/lib/feed";
import { imageUrl } from "@/lib/user-view";
import { Button } from "./button";
import { EmptyIllustration } from "./empty-illustration";
import { ProfilePostsSkeleton } from "./skeleton";
import { useInfiniteList } from "./use-infinite-list";

export function ProfilePosts({
  authorId,
  first,
  isOwner,
}: {
  authorId: string;
  first: Page<ProfilePost>;
  isOwner: boolean;
}) {
  const { items, done, loading, failed, retry, sentinel } = useInfiniteList(first, `/api/posts?author=${authorId}`);

  if (items.length === 0 && done) {
    return (
      <div className="mt-6 flex flex-col items-center rounded-xl border border-line px-6 py-12 text-center sm:py-16">
        <EmptyIllustration className="w-44 sm:w-52" />
        <h3 className="mt-6 text-xl font-semibold text-ink sm:text-2xl">
          {isOwner ? "ჯერ არაფერი დაგიწერია" : "ჯერ ბლოგები არ არის"}
        </h3>
        <p className="mt-2 text-muted">
          {isOwner ? "შენი ბლოგები აქ გამოჩნდება." : "როცა ავტორი რამეს გამოაქვეყნებს, აქ გამოჩნდება."}
        </p>
        {isOwner && (
          <Button href="/write" variant="outline" className="mt-6">
            დაიწყე წერა
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-line">
        {items.map((post) => (
          <li key={post.id} className="animate-rise">
            <Link href={post.href} className="group flex gap-4 py-6 sm:gap-6">
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 text-lg font-bold leading-snug break-words text-ink group-hover:underline sm:text-xl">
                  {post.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 break-words text-muted">{post.description}</p>
                <p className="mt-3 text-sm text-muted">{post.date}</p>
              </div>
              {post.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl(post.cover)}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/3] w-24 shrink-0 self-start rounded-lg bg-surface object-cover sm:w-36"
                />
              )}
            </Link>
          </li>
        ))}
      </ul>

      <div ref={sentinel} />
      {loading && (
        <div className="border-t border-line">
          <ProfilePostsSkeleton count={2} />
        </div>
      )}
      {failed && (
        <div className="flex flex-col items-center gap-3 border-t border-line py-10 text-center">
          <p className="text-muted">ვერ ჩაიტვირთა</p>
          <Button variant="outline" size="sm" onClick={retry}>
            თავიდან ცდა
          </Button>
        </div>
      )}
    </>
  );
}
