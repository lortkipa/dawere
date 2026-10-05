"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { searchAuthors } from "@/app/admin/blogs/actions";
import { avatarUrl } from "@/lib/user-view";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { Dialog } from "../dialog";
import { TextInput } from "../text-input";

type Author = Awaited<ReturnType<typeof searchAuthors>>[number];

// A blog is always someone's: pick the author first, then write.
export function NewPostButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>დამატება</Button>
      {open && <AuthorDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function AuthorDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ query: string; authors: Author[] } | null>(null);

  useEffect(() => {
    let stale = false;
    const timer = setTimeout(async () => {
      const authors = await searchAuthors(query);
      if (!stale) setFound({ query, authors });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <Dialog title="ვის სახელით?" art="write" onClose={onClose}>
      <TextInput
        autoFocus
        type="search"
        aria-label="ავტორის ძებნა"
        placeholder="სახელი, ელფოსტა, @სახელი"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full"
      />
      <ul className="mt-3 flex min-h-48 flex-col">
        {found?.authors.map((author) => (
          <li key={author.id}>
            <button
              type="button"
              onClick={() => router.push(`/admin/blogs/new?author=${author.id}`)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface"
            >
              <Avatar src={avatarUrl(author.avatar)} className="size-9" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{author.name || "უსახელო"}</span>
                <span className="block truncate text-sm text-muted">@{author.handle}</span>
              </span>
            </button>
          </li>
        ))}
        {found && found.authors.length === 0 && (
          <li className="py-10 text-center text-sm text-muted">ასეთი მომხმარებელი არ მოიძებნა</li>
        )}
      </ul>
    </Dialog>
  );
}
