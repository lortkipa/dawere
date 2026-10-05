import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { UserActions, UserEditor } from "@/components/admin/user-editor";
import { ChatList } from "@/components/admin/chat-list";
import { CommentList } from "@/components/admin/comment-list";
import { Empty, RoleBadge, Stat } from "@/components/admin/ui";
import { Button } from "@/components/button";
import { Avatar } from "@/components/avatar";
import { requireAdmin } from "@/lib/admin";
import { commentFilters, commentRows, listComments, listPosts, postFilters } from "@/lib/admin-content";
import { chatFilters, listChats } from "@/lib/admin-chats";
import { getUserDetail } from "@/lib/admin-users";
import { getCategories } from "@/lib/categories";
import { uuidPattern } from "@/lib/ids";
import { referrals } from "@/lib/onboarding-options";
import { canManage, canRemove, canSetRole, isSuperadmin } from "@/lib/roles";
import { avatarUrl, formatDate, formatShortDate } from "@/lib/user-view";

// How many of a user's blogs, comments and AI chats the page shows; the rest are a link away.
const latest = 5;

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;
  const detail = uuidPattern.test(id) ? await getUserDetail(id) : null;
  if (!detail) notFound();
  const { user } = detail;
  const editable = canManage(actor, user);
  const [{ rows: latestPosts }, { rows: latestComments }, { rows: latestChats, total: chats }] = await Promise.all([
    listPosts(postFilters({ author: user.id }), latest),
    listComments(commentFilters({ author: user.id }), latest),
    listChats(chatFilters({ user: user.id }), latest),
  ]);
  const referral = referrals.find((option) => option.slug === user.referral);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/users"
        className="flex w-fit items-center gap-2 rounded-md text-sm text-muted transition-colors hover:text-ink"
      >
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
        მომხმარებლები
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar src={avatarUrl(user.avatar)} className="size-16" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-bold tracking-[-0.01em]">{user.name || "უსახელო"}</h1>
              <RoleBadge role={user.role} />
            </div>
            <p className="mt-0.5 truncate text-muted">
              @{user.handle} · {user.email}
            </p>
          </div>
        </div>
        <UserActions
          id={user.id}
          handle={user.handle}
          onboarded={!!user.onboardedAt}
          sessions={detail.sessions}
          canSignOut={editable}
          canDelete={canRemove(actor, user)}
          posts={detail.posts}
          comments={detail.comments}
        />
      </div>

      {!editable && (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-muted">
          ადმინების მონაცემებს მხოლოდ სუპერადმინი ცვლის.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <Stat label="ბლოგები" value={detail.posts} href={`/admin/blogs?author=${user.id}`} />
        <Stat label="კომენტარები" value={detail.comments} href={`/admin/comments?author=${user.id}`} />
        <Stat label="AI ჩატები" value={chats} href={`/admin/chats?user=${user.id}`} />
        <Stat label="გამომწერები" value={detail.followers} />
        <Stat label="გამოწერილი" value={detail.following} />
        <Stat label="მოწონებული" value={detail.likes} />
        <Stat label="წაკითხული" value={detail.opened} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <UserEditor
          user={{
            id: user.id,
            email: user.email,
            handle: user.handle,
            name: user.name ?? "",
            bio: user.bio,
            avatar: user.avatar,
            favoritesPublic: user.favoritesPublic,
            role: user.role,
            topics: user.topics ?? [],
          }}
          editable={editable}
          emailLocked={isSuperadmin(user)}
          canSetRole={canSetRole(actor, user)}
          topics={await getCategories()}
        />

        <section className="h-fit rounded-xl border border-line">
          <h2 className="border-b border-line px-5 py-3 font-semibold">ინფორმაცია</h2>
          <dl className="flex flex-col gap-3 px-5 py-4 text-[15px]">
            <Fact label="რეგისტრაცია">{formatDate(user.createdAt)}</Fact>
            <Fact label="რეგისტრაციის დასრულება">
              {user.onboardedAt ? formatDate(user.onboardedAt) : "არ დაუსრულებია"}
            </Fact>
            <Fact label="ბოლო შესვლა">{detail.lastSignIn ? formatDate(detail.lastSignIn) : "—"}</Fact>
            <Fact label="აქტიური სესიები">{detail.sessions}</Fact>
            <Fact label="რჩეულები">{detail.favorites}</Fact>
            <Fact label="საიდან გაიგო">
              {referral ? `${referral.label}${user.referralOther ? `: ${user.referralOther}` : ""}` : "—"}
            </Fact>
          </dl>
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">ბოლო ბლოგები</h2>
          <div className="flex gap-2">
            {editable && user.onboardedAt && (
              <Button variant="outline" size="sm" href={`/admin/blogs/new?author=${user.id}`}>
                ბლოგის დამატება
              </Button>
            )}
            {detail.posts > 0 && (
              <Button variant="ghost" size="sm" href={`/admin/blogs?author=${user.id}`}>
                ყველა ({detail.posts})
              </Button>
            )}
          </div>
        </div>
        {latestPosts.length === 0 ? (
          <Empty>ბლოგები ჯერ არ აქვს</Empty>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
            {latestPosts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/admin/blogs/${post.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface"
                >
                  <span className="min-w-0 truncate font-medium">{post.title}</span>
                  <span className="shrink-0 text-sm text-muted tabular-nums">
                    {post.opens} წაკითხვა · {formatShortDate(post.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">ბოლო კომენტარები</h2>
          {detail.comments > 0 && (
            <Button variant="ghost" size="sm" href={`/admin/comments?author=${user.id}`}>
              ყველა ({detail.comments})
            </Button>
          )}
        </div>
        {latestComments.length === 0 ? (
          <Empty>კომენტარები ჯერ არ აქვს</Empty>
        ) : (
          <CommentList comments={commentRows(latestComments, actor)} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">ბოლო AI ჩატები</h2>
          {chats > 0 && (
            <Button variant="ghost" size="sm" href={`/admin/chats?user=${user.id}`}>
              ყველა ({chats})
            </Button>
          )}
        </div>
        {latestChats.length === 0 ? (
          <Empty>AI ჩატები ჯერ არ აქვს</Empty>
        ) : (
          <ChatList chats={latestChats} filterHref={(name, value) => `/admin/chats?${name}=${value}`} />
        )}
      </section>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-0.5 break-words">{children}</dd>
    </div>
  );
}
