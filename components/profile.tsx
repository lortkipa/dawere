"use client";

import { useState } from "react";
import { avatarUrl } from "@/lib/user-view";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { EmptyIllustration } from "./empty-illustration";

type ProfileUser = { name: string; bio: string | null; avatar: string | null };

// There are no posts, follows or editor yet: the list is always empty, following lives in
// client state only (like the feed) and the write buttons do nothing.
export function Profile({
  user,
  isOwner,
  signedIn,
}: {
  user: ProfileUser;
  isOwner: boolean;
  signedIn: boolean;
}) {
  const [followed, setFollowed] = useState(false);
  const followers = followed ? 1 : 0;

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
          <Button className="w-full gap-2 sm:w-auto">
            <PenIcon />
            დაწერე
          </Button>
        ) : signedIn ? (
          <Button
            variant={followed ? "outline" : "primary"}
            aria-pressed={followed}
            onClick={() => setFollowed((value) => !value)}
            className="w-full sm:w-auto sm:min-w-32"
          >
            {followed ? "გამოწერილი" : "გამოწერა"}
          </Button>
        ) : (
          <Button href="/auth" className="w-full sm:w-auto sm:min-w-32">
            გამოწერა
          </Button>
        )}
      </section>

      <section className="mt-10">
        <h2 className="border-b border-line pb-3 font-semibold text-ink">ბლოგები</h2>
        <div className="mt-6 flex flex-col items-center rounded-xl border border-line px-6 py-12 text-center sm:py-16">
          <EmptyIllustration className="w-44 sm:w-52" />
          <h3 className="mt-6 text-xl font-semibold text-ink sm:text-2xl">
            {isOwner ? "ჯერ არაფერი დაგიწერია" : "ჯერ ბლოგები არ არის"}
          </h3>
          <p className="mt-2 text-muted">
            {isOwner ? "შენი ბლოგები აქ გამოჩნდება." : "როცა ავტორი რამეს გამოაქვეყნებს, აქ გამოჩნდება."}
          </p>
          {isOwner && (
            <Button variant="outline" className="mt-6">
              დაიწყე წერა
            </Button>
          )}
        </div>
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
