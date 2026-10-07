import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/admin/back-link";
import { BlogActions } from "@/components/admin/blog-actions";
import { ChatList } from "@/components/admin/chat-list";
import { CommentList } from "@/components/admin/comment-list";
import { Empty, Stat } from "@/components/admin/ui";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { requireAdmin } from "@/lib/admin";
import { getCategories } from "@/lib/categories";
import { chatFilters, listChats } from "@/lib/admin-chats";
import { commentFilters, commentRows, getPostDetail, listComments } from "@/lib/admin-content";
import { postExtensions } from "@/lib/post-schema";
import { canManage } from "@/lib/roles";
import { tagView } from "@/lib/tags";
import { avatarUrl, formatDate, imageUrl } from "@/lib/user-view";

// Every comment on one blog, oldest first, in one list.
const maxComments = 1000;
// The latest AI chats on it; the rest are a link away.
const latestChats = 5;

export default async function AdminBlog({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  const detail = await getPostDetail((await params).id);
  if (!detail) notFound();
  const { post, author } = detail;
  const [categories, { rows }, { rows: chatRows, total: chats }] = await Promise.all([
    getCategories(),
    listComments(commentFilters({ post: post.id, sort: "old" }), maxComments),
    listChats(chatFilters({ post: post.id }), latestChats),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/admin/blogs">ბლოგები</BackLink>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={`/admin/users/${author.id}`} className="flex min-w-0 items-center gap-3">
          <Avatar src={avatarUrl(author.avatar)} className="size-10" />
          <span className="min-w-0">
            <span className="block truncate font-medium hover:underline">{author.name || `@${author.handle}`}</span>
            <span className="block text-sm text-muted">{formatDate(post.createdAt)}</span>
          </span>
        </Link>
        <BlogActions
          id={post.id}
          href={`/@${author.handle}/${post.id}`}
          editable={canManage(actor, author)}
          comments={detail.comments}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="ნანახი ფიდში" value={detail.seen} />
        <Stat label="წაკითხვა" value={detail.opens} />
        <Stat label="მოწონება" value={detail.likes} />
        <Stat label="რჩეულებში" value={detail.favorites} />
        <Stat label="კომენტარი" value={detail.comments} />
        <Stat label="AI ჩატი" value={chats} href={`/admin/chats?post=${post.id}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <article className="min-w-0 rounded-xl border border-line px-5 py-6 sm:px-8">
          {post.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl(post.cover)} alt="" className="mb-6 w-full rounded-xl" />
          )}
          <h1 className="text-[clamp(1.5rem,4vw,2rem)] leading-tight font-extrabold tracking-[-0.015em] break-words">
            {post.title}
          </h1>
          <p className="mt-2 text-lg leading-relaxed break-words text-muted">{post.description}</p>
          {post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => {
                const view = tagView(tag, categories);
                return (
                  <span key={tag} className="rounded-full border border-line px-2.5 py-0.5 text-sm">
                    {view.emoji ? `${view.emoji} ${view.label}` : `#${view.label}`}
                  </span>
                );
              })}
            </div>
          )}
          <div className="post-body mt-6">
            {renderToReactElement({ content: post.body, extensions: postExtensions })}
          </div>
        </article>

        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-baseline gap-2 text-lg font-semibold">
                AI ჩატები <span className="text-base font-normal text-muted tabular-nums">{chats}</span>
              </h2>
              {chats > 0 && (
                <Button variant="ghost" size="sm" href={`/admin/chats?post=${post.id}`}>
                  ყველა ({chats})
                </Button>
              )}
            </div>
            {chatRows.length === 0 ? (
              <Empty>AI ჩატები ჯერ არ არის</Empty>
            ) : (
              <ChatList
                chats={chatRows}
                filterHref={(name, value) => `/admin/chats?${name}=${value}`}
                showPost={false}
              />
            )}
          </section>

          <section className="flex min-w-0 flex-col gap-3">
            <h2 className="flex items-baseline gap-2 text-lg font-semibold">
              კომენტარები <span className="text-base font-normal text-muted tabular-nums">{rows.length}</span>
            </h2>
            {rows.length === 0 ? (
              <Empty>კომენტარები ჯერ არ არის</Empty>
            ) : (
              <CommentList comments={commentRows(rows, actor)} showPost={false} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
