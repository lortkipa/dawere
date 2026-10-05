import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { UserActions, UserEditor } from "@/components/admin/user-editor";
import { RoleBadge, Stat } from "@/components/admin/ui";
import { Avatar } from "@/components/avatar";
import { requireAdmin } from "@/lib/admin";
import { getUserDetail } from "@/lib/admin-users";
import { uuidPattern } from "@/lib/ids";
import { referrals } from "@/lib/onboarding-options";
import { canManage, canRemove, canSetRole, isSuperadmin } from "@/lib/roles";
import { avatarUrl, formatDate } from "@/lib/user-view";

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAdmin();
  const { id } = await params;
  const detail = uuidPattern.test(id) ? await getUserDetail(id) : null;
  if (!detail) notFound();
  const { user } = detail;
  const editable = canManage(actor, user);
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="ბლოგები" value={detail.posts} />
        <Stat label="კომენტარები" value={detail.comments} />
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
