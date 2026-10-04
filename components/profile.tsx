"use client";

import Link from "next/link";
import { avatarUrl, imageUrl } from "@/lib/user-view";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { EmptyIllustration } from "./empty-illustration";
import { FollowButton, useFollow } from "./follow-button";

type ProfileUser = { id: string; name: string; bio: string | null; avatar: string | null };
export type ProfilePost = { href: string; title: string; description: string; cover: string | null; date: string };

export function Profile({
  user,
  posts,
  followers: storedFollowers,
  followed: storedFollowed,
  isOwner,
  signedIn,
}: {
  user: ProfileUser;
  posts: ProfilePost[];
  followers: number;
  followed: boolean;
  isOwner: boolean;
  signedIn: boolean;
}) {
  const [followed, toggleFollow] = useFollow(user.id, storedFollowed);
  // Moves with the button right away instead of waiting for the refresh.
  const followers = storedFollowers + Number(followed) - Number(storedFollowed);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5">
          <Avatar src={avatarUrl(user.avatar)} className="size-16 sm:size-20" />
          <div className="min-w-0 flex-1 sm:pt-1">
            <h1 title={user.name} className="truncate text-xl font-extrabold leading-tight text-ink">
              {user.name}
            </h1>
            {user.bio && <p className="mt-1.5 whitespace-pre-line break-words text-muted">{user.bio}</p>}
            <p className="mt-2 text-sm text-muted">
              <span className="font-medium text-ink">{followers}</span> გამომწერი
            </p>
          </div>
        </div>

        {isOwner ? (
          <Button href="/write" className="w-full gap-2 sm:w-auto">
            <PenIcon />
            დაწერე
          </Button>
        ) : (
          <FollowButton
            signedIn={signedIn}
            followed={followed}
            onToggle={toggleFollow}
            className="w-full sm:w-auto sm:min-w-32"
          />
        )}
      </section>

      <section className="mt-10">
        <h2 className="border-b border-line pb-3 font-semibold text-ink">ბლოგები</h2>
        {posts.length > 0 ? (
          <ul className="divide-y divide-line">
            {posts.map((post) => (
              <li key={post.href}>
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
                      className="aspect-[4/3] w-24 shrink-0 self-start rounded-lg object-cover sm:w-36"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
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
        )}
      </section>
    </div>
  );
}

function PenIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}
