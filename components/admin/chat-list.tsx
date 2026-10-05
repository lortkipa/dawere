import Link from "next/link";
import type { AdminChat } from "@/lib/admin-chats";
import { avatarUrl, formatShortDate } from "@/lib/user-view";
import { Avatar } from "../avatar";

/*
  Reading chats as rows. The first question links to the chat and stretches over the row; the
  reader and the blog sit above that link and go to the chat list narrowed to them, via
  `filterHref`. `showPost` is off on a blog's own page, where every row is about that blog.
*/
export function ChatList({
  chats,
  filterHref,
  showPost = true,
}: {
  chats: AdminChat[];
  filterHref: (name: "user" | "post", value: string) => string;
  showPost?: boolean;
}) {
  return (
    <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
      {chats.map((chat) => (
        <li key={chat.id} className="relative flex gap-3 px-4 py-3.5 transition-colors hover:bg-surface">
          <Avatar src={avatarUrl(chat.userAvatar)} className="size-9" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <Link href={filterHref("user", chat.userId)} className="relative z-10 font-medium hover:underline">
                {chat.userName || `@${chat.userHandle}`}
              </Link>
              <span className="text-muted">· {formatShortDate(chat.createdAt)}</span>
              <span className="text-muted tabular-nums">· {chat.questions} შეკითხვა</span>
              {chat.failed && <span className="text-danger">· შეწყვეტილი პასუხი</span>}
            </div>
            <Link
              href={`/admin/chats/${chat.id}`}
              className="mt-1 line-clamp-2 text-[15px] break-words after:absolute after:inset-0"
            >
              {chat.firstQuestion}
            </Link>
            {showPost && (
              <Link
                href={filterHref("post", chat.postId)}
                className="relative z-10 mt-1.5 block w-fit max-w-full truncate text-sm text-muted hover:text-ink hover:underline"
              >
                {chat.postTitle}
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
