import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/admin/back-link";
import { Button } from "@/components/button";
import { Avatar } from "@/components/avatar";
import { requireAdmin } from "@/lib/admin";
import { getChat } from "@/lib/admin-chats";
import { avatarUrl, formatDateTime, formatTime } from "@/lib/user-view";

// One reading chat as the reader saw it: questions on the right, answers on the left.
export default async function AdminChat({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const chat = await getChat((await params).id);
  if (!chat) notFound();
  const { user, post } = chat;

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/admin/chats">AI ჩატები</BackLink>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={`/admin/users/${user.id}`} className="flex min-w-0 items-center gap-3">
          <Avatar src={avatarUrl(user.avatar)} className="size-10" />
          <span className="min-w-0">
            <span className="block truncate font-medium hover:underline">{user.name || `@${user.handle}`}</span>
            <span className="block text-sm text-muted">{formatDateTime(chat.createdAt)}</span>
          </span>
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" href={`/admin/chats?user=${user.id}`}>
            მკითხველის ყველა ჩატი
          </Button>
          <Button variant="outline" size="sm" href={`/admin/chats?post=${post.id}`}>
            ბლოგის ყველა ჩატი
          </Button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 rounded-xl border border-line px-4 py-5 sm:px-6">
        <Link
          href={`/admin/blogs/${post.id}`}
          className="truncate border-b border-line pb-4 text-sm text-muted hover:text-ink hover:underline"
        >
          ბლოგი: {post.title}
        </Link>
        {chat.messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="ml-auto flex max-w-[85%] flex-col items-end gap-1">
              <p className="rounded-2xl rounded-br-md border border-line bg-surface px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap">
                {message.text}
              </p>
              <span className="text-xs text-muted tabular-nums">{formatTime(message.createdAt)}</span>
            </div>
          ) : (
            <div key={message.id} className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
              {message.text}
              {message.failed && (
                <p className={`text-sm text-danger ${message.text ? "mt-2" : ""}`}>
                  {message.text ? "პასუხი აქ შეწყდა." : "პასუხი ვერ მიიღო."}
                </p>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
