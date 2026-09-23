import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, sql } from 'drizzle-orm';
import { ArrowLeft, ExternalLink, FileText, Flag, MessageSquare } from 'lucide-react';
import { db } from '@/db';
import { users } from '@/db/schema';
import { updateUserAction } from '@/app/actions/admin';
import { requireAdmin } from '@/lib/auth';
import { actionLabel, canManage } from '@/lib/admin';
import { AccessBadge, AdminMain, When } from '@/components/admin/bits';
import { AccountControls, AdminSection, EditUserForm } from '@/components/admin/user-forms';
import { Avatar, Badge, ButtonLink, SectionHeading } from '@/components/ui';
import { DISCOVERY_OPTIONS, ROLE_OPTIONS } from '@/lib/onboarding-options';
import { formatCount, isUuid, timeAgo } from '@/lib/utils';

export const metadata: Metadata = { title: 'მომხმარებელი' };

const labelFor = (options: readonly { key: string; label: string }[], key: string) =>
  options.find((o) => o.key === key)?.label ?? '—';

export default async function AdminUserPage(props: PageProps<'/admin/users/[id]'>) {
  const { id } = await props.params;
  const actor = await requireAdmin(`/admin/users/${id}`);
  if (!isUuid(id)) notFound();

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) notFound();

  const [[stats], recentPosts, history] = await Promise.all([
    db.execute<{
      published: number;
      drafts: number;
      views: number;
      comments: number;
      likes_given: number;
      followers: number;
      following: number;
      sessions: number;
      reports_open: number;
      reports_total: number;
    }>(sql`
      select
        (select count(*)::int from posts where author_id = ${id}::uuid and status = 'published') as published,
        (select count(*)::int from posts where author_id = ${id}::uuid and status = 'draft') as drafts,
        (select coalesce(sum(view_count), 0)::int from posts where author_id = ${id}::uuid) as views,
        (select count(*)::int from comments where author_id = ${id}::uuid and deleted_at is null) as comments,
        (select count(*)::int from likes where user_id = ${id}::uuid) as likes_given,
        (select count(*)::int from follows where following_id = ${id}::uuid) as followers,
        (select count(*)::int from follows where follower_id = ${id}::uuid) as following,
        (select count(*)::int from sessions where user_id = ${id}::uuid and expires_at > now()) as sessions,
        (select count(*)::int from reports where target_owner_id = ${id}::uuid and status = 'open') as reports_open,
        (select count(*)::int from reports where target_owner_id = ${id}::uuid) as reports_total
    `),
    db.execute<{ id: string; title: string; status: string; updated_at: string; view_count: number }>(sql`
      select id, title, status, updated_at, view_count from posts
      where author_id = ${id}::uuid
      order by updated_at desc
      limit 8
    `),
    db.execute<{ id: number; actor_name: string; action: string; target_label: string; created_at: string; mine: boolean }>(sql`
      select id, actor_name, action, target_label, created_at, (actor_id = ${id}::uuid) as mine
      from admin_log
      where (target_type = 'user' and target_id = ${id}) or actor_id = ${id}::uuid
      order by created_at desc
      limit 12
    `),
  ]);

  const manageable = canManage(actor, user);
  const isSelf = actor.id === user.id;

  return (
    <AdminMain>
      <Link
        href="/admin/users"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        მომხმარებლები
      </Link>

      <header className="mb-8 flex flex-wrap items-center gap-4">
        <Avatar name={user.name} src={user.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-ink">{user.name}</h1>
            <AccessBadge access={user.access} />
            {user.suspendedAt ? <Badge tone="danger">შეჩერებული</Badge> : null}
            {!user.onboardedAt ? <Badge>ონბორდინგი არ დაუსრულებია</Badge> : null}
          </div>
          <p className="mt-0.5 truncate text-[15px] text-muted">
            @{user.username} · {user.email}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/admin/posts?author=${user.id}`} variant="outline" size="sm">
            <FileText />
            სტატიები
          </ButtonLink>
          <ButtonLink href={`/admin/comments?author=${user.id}`} variant="outline" size="sm">
            <MessageSquare />
            კომენტარები
          </ButtonLink>
          <ButtonLink href={`/u/${user.username}`} variant="outline" size="sm">
            <ExternalLink />
            პროფილი
          </ButtonLink>
        </div>
      </header>

      {stats.reports_total > 0 ? (
        <Link
          href={`/admin/reports?owner=${user.id}${stats.reports_open > 0 ? '' : '&status=all'}`}
          className={
            stats.reports_open > 0
              ? 'mb-6 flex items-center gap-2 rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning-text'
              : 'mb-6 flex items-center gap-2 rounded-xl border border-line bg-sunken px-4 py-3 text-sm text-muted hover:text-ink'
          }
        >
          <Flag className="size-4 shrink-0" />
          {stats.reports_open > 0
            ? `${stats.reports_open} განსახილველი საჩივარი ამ ანგარიშზე ან მის შინაარსზე`
            : `${stats.reports_total} დახურული საჩივარი ამ ანგარიშზე ან მის შინაარსზე`}
        </Link>
      ) : null}

      {user.suspendedAt ? (
        <div className="mb-6 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          შეჩერებულია {timeAgo(user.suspendedAt)}
          {user.suspendedReason ? `: ${user.suspendedReason}` : '.'}
        </div>
      ) : null}

      {!manageable ? (
        <div className="mb-6 rounded-xl border border-line bg-sunken px-4 py-3 text-sm text-muted">
          {isSelf ? (
            <>
              ეს შენი ანგარიშია. შეცვალე ის{' '}
              <Link href="/settings" className="font-medium text-ink underline underline-offset-4">
                პარამეტრებში
              </Link>
              .
            </>
          ) : user.access === 'super_admin' ? (
            'სუპერადმინის ანგარიშს ადმინისტრირებიდან ვერავინ შეცვლის.'
          ) : (
            'ადმინის ანგარიშს მხოლოდ სუპერადმინი ცვლის.'
          )}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            {[
              ['გამოქვეყნებული', stats.published],
              ['მონახაზი', stats.drafts],
              ['ნახვები', stats.views],
              ['კომენტარები', stats.comments],
              ['გამომწერები', stats.followers],
              ['გამოწერილი', stats.following],
              ['მოწონებები', stats.likes_given],
              ['აქტიური სესიები', stats.sessions],
            ].map(([label, value]) => (
              <div key={label} className="bg-raised px-4 py-3">
                <dt className="text-[12px] text-muted">{label}</dt>
                <dd className="mt-1 text-lg font-semibold text-ink tabular-nums">{formatCount(Number(value))}</dd>
              </div>
            ))}
          </dl>

          <AdminSection title="პროფილი">
            <EditUserForm
              action={updateUserAction.bind(null, user.id)}
              disabled={!manageable}
              initial={{
                name: user.name,
                username: user.username,
                email: user.email,
                bio: user.bio,
                location: user.location,
                website: user.website,
              }}
            />
          </AdminSection>

          {manageable ? (
            <AccountControls
              actorIsSuper={actor.access === 'super_admin'}
              user={{
                id: user.id,
                name: user.name,
                username: user.username,
                access: user.access,
                suspended: Boolean(user.suspendedAt),
                hasAvatar: Boolean(user.avatarUrl),
              }}
            />
          ) : null}
        </div>

        <aside className="space-y-8">
          <section>
            <SectionHeading>დეტალები</SectionHeading>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">დარეგისტრირდა</dt>
                <dd>
                  <When date={user.createdAt} />
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">ბოლო ცვლილება</dt>
                <dd>
                  <When date={user.updatedAt} />
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">ვინ არის</dt>
                <dd className="text-ink">{labelFor(ROLE_OPTIONS, user.role)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">საიდან გაიგო</dt>
                <dd className="truncate text-right text-ink" title={user.discoveryNote || undefined}>
                  {labelFor(DISCOVERY_OPTIONS, user.discoverySource)}
                  {user.discoveryNote ? ` — ${user.discoveryNote}` : ''}
                </dd>
              </div>
            </dl>
          </section>

          <section>
            <SectionHeading
              action={
                <Link href={`/admin/posts?author=${user.id}`} className="text-[12px] font-medium text-muted hover:text-ink">
                  ყველა
                </Link>
              }
            >
              ბოლო სტატიები
            </SectionHeading>
            {recentPosts.length === 0 ? (
              <p className="text-[13px] text-subtle">სტატიები არ აქვს.</p>
            ) : (
              <ul className="space-y-3">
                {recentPosts.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/admin/posts/${post.id}`}
                      className="line-clamp-1 text-sm font-medium text-ink hover:underline"
                    >
                      {post.title || 'უსათაურო'}
                    </Link>
                    <p className="text-[12px] text-subtle">
                      {post.status === 'published' ? `${formatCount(post.view_count)} ნახვა` : 'მონახაზი'} ·{' '}
                      {timeAgo(post.updated_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionHeading>ისტორია</SectionHeading>
            {history.length === 0 ? (
              <p className="text-[13px] text-subtle">ადმინებს ამ ანგარიშზე არაფერი შეუცვლიათ.</p>
            ) : (
              <ul className="space-y-3">
                {history.map((entry) => (
                  <li key={entry.id} className="text-[13px] leading-snug">
                    <span className="font-medium text-ink">{entry.actor_name}</span>{' '}
                    <span className="text-muted">{actionLabel(entry.action)}</span>
                    {entry.mine && entry.target_label ? <span className="text-muted"> — {entry.target_label}</span> : null}
                    <p className="text-[12px] text-subtle">{timeAgo(entry.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </AdminMain>
  );
}
