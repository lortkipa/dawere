'use client';

import { Fragment, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Ban,
  Check,
  ChevronRight,
  EyeOff,
  ExternalLink,
  FileText,
  MessageSquare,
  RotateCcw,
  Trash2,
  User,
  X,
} from 'lucide-react';
import {
  deleteCommentsAction,
  deletePostsAction,
  setReportStatusAction,
  unpublishPostsAction,
  type AdminResult,
} from '@/app/actions/admin';
import {
  BulkBar,
  Checkbox,
  FormDialog,
  RowMenu,
  TD_CLASS,
  TH_CLASS,
  TableFrame,
  type MenuItem,
} from '@/components/admin/controls';
import { toast } from '@/components/toaster';
import { Avatar, Badge, Button } from '@/components/ui';
import { REPORT_STATUS_LABELS, REPORT_TARGET_LABELS, reasonLabel } from '@/lib/reports';
import { cn, formatDate, timeAgo } from '@/lib/utils';

type Status = 'open' | 'resolved' | 'dismissed';

export type ReportGroup = {
  key: string;
  type: 'post' | 'comment' | 'user';
  id: string;
  /** Snapshot at report time: the post title, the comment's post, or "name (@handle)". */
  label: string;
  excerpt: string;
  status: Status;
  reports: number;
  open: number;
  lastAt: string;
  owner: { id: string; name: string; username: string; avatarUrl: string | null; exists: boolean } | null;
  /** What the target looks like now; null once it is gone. */
  live:
    | { title: string; slug: string; published: boolean }
    | { body: string; deleted: boolean; postId: string; slug: string; postTitle: string; published: boolean }
    | { name: string; username: string; suspended: boolean }
    | null;
  items: {
    id: string;
    reason: string;
    details: string;
    status: Status;
    createdAt: string;
    resolvedAt: string | null;
    reporter: { id: string; name: string; username: string } | null;
    resolverName: string | null;
  }[];
};

const TYPE_ICONS = { post: FileText, comment: MessageSquare, user: User } as const;

const STATUS_TONES: Record<Status, 'warning' | 'accent' | 'neutral'> = {
  open: 'warning',
  resolved: 'accent',
  dismissed: 'neutral',
};

type Pending = { kind: 'delete-comment' | 'delete-post' | 'unpublish'; group: ReportGroup };

/** Reason → how many times, most frequent first. */
function reasonCounts(group: ReportGroup) {
  const counts = new Map<string, number>();
  for (const item of group.items) counts.set(item.reason, (counts.get(item.reason) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function publicHref(group: ReportGroup): string | null {
  const live = group.live;
  if (!live) return null;
  if (group.type === 'post' && 'title' in live) return live.published ? `/p/${live.slug}` : null;
  if (group.type === 'comment' && 'body' in live) {
    return live.published && !live.deleted ? `/p/${live.slug}#comment-${group.id}` : null;
  }
  if (group.type === 'user' && 'username' in live) return `/u/${live.username}`;
  return null;
}

function adminHref(group: ReportGroup): string | null {
  const live = group.live;
  if (!live) return null;
  if (group.type === 'post') return `/admin/posts/${group.id}`;
  if (group.type === 'comment' && 'postId' in live) return `/admin/comments?post=${live.postId}`;
  if (group.type === 'user') return `/admin/users/${group.id}`;
  return null;
}

function TargetCell({ group }: { group: ReportGroup }) {
  const Icon = TYPE_ICONS[group.type];
  const live = group.live;
  const gone = !live || (group.type === 'comment' && live && 'deleted' in live && live.deleted);

  // Prefer what the target says now; fall back to the copy taken at report time.
  let title = group.label;
  let body = group.excerpt;
  if (live && group.type === 'post' && 'title' in live) title = live.title || 'უსათაურო';
  if (live && group.type === 'comment' && 'body' in live && !live.deleted) body = live.body;
  if (live && group.type === 'user' && 'username' in live) title = `${live.name} (@${live.username})`;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge>
          <Icon />
          {REPORT_TARGET_LABELS[group.type]}
        </Badge>
        {gone ? <Badge tone="danger">წაშლილია</Badge> : null}
        {live && 'published' in live && !live.published ? <Badge>გამოუქვეყნებელი</Badge> : null}
        {live && 'suspended' in live && live.suspended ? <Badge tone="danger">შეჩერებული</Badge> : null}
      </div>
      {group.type === 'comment' ? (
        <>
          <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-ink">{body || '—'}</p>
          <p className="mt-0.5 line-clamp-1 text-[12px] text-subtle">სტატიაზე: {title}</p>
        </>
      ) : (
        <>
          <p className="mt-1.5 line-clamp-2 font-medium text-ink">{title}</p>
          {body ? <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{body}</p> : null}
        </>
      )}
    </div>
  );
}

export function ReportsTable({ groups }: { groups: ReportGroup[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = groups.filter((g) => selected.has(g.key));
  const allChecked = groups.length > 0 && visible.length === groups.length;
  const openSelected = visible.filter((g) => g.open > 0);
  const closedSelected = visible.filter((g) => g.open === 0);

  function toggle(set: Set<string>, key: string) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }

  function run(action: () => Promise<AdminResult>, success: (count: number) => string) {
    startTransition(async () => {
      const result = await action();
      setConfirm(null);
      if (!result.ok) {
        toast(result.error ?? 'ვერ მოხერხდა.', 'error');
        return;
      }
      setSelected(new Set());
      toast(success(result.count ?? 0));
      router.refresh();
    });
  }

  function setStatus(targets: ReportGroup[], status: 'resolved' | 'dismissed' | 'open') {
    run(
      () => setReportStatusAction(targets.map((g) => ({ type: g.type, id: g.id })), status),
      (count) =>
        status === 'open'
          ? `ხელახლა გაიხსნა: ${count}`
          : status === 'resolved'
            ? `მოგვარებულად მოინიშნა: ${count}`
            : `უარყოფილია: ${count}`,
    );
  }

  function menuFor(group: ReportGroup): (MenuItem | null)[] {
    const view = publicHref(group);
    const admin = adminHref(group);
    const live = group.live;
    const items: (MenuItem | null)[] = [];
    if (view) items.push({ label: 'საიტზე ნახვა', icon: <ExternalLink />, href: view });
    if (admin) {
      items.push({
        label: group.type === 'user' ? 'ანგარიშის მართვა' : group.type === 'post' ? 'სტატიის მართვა' : 'სტატიის კომენტარები',
        icon: group.type === 'user' ? <User /> : group.type === 'post' ? <FileText /> : <MessageSquare />,
        href: admin,
      });
    }
    if (group.owner?.exists && group.type !== 'user') {
      items.push({ label: 'ავტორის ანგარიში', icon: <User />, href: `/admin/users/${group.owner.id}` });
    }

    items.push(null);
    if (group.open > 0) {
      items.push({ label: 'მოგვარებულად მონიშვნა', icon: <Check />, onSelect: () => setStatus([group], 'resolved') });
      items.push({ label: 'უარყოფა: დარღვევა არაა', icon: <X />, onSelect: () => setStatus([group], 'dismissed') });
    } else {
      items.push({ label: 'ხელახლა გახსნა', icon: <RotateCcw />, onSelect: () => setStatus([group], 'open') });
    }

    // Acting on the content closes its reports as resolved, server-side.
    const moderation: MenuItem[] = [];
    if (group.type === 'comment' && live && 'deleted' in live && !live.deleted) {
      moderation.push({ label: 'კომენტარის წაშლა', icon: <Trash2 />, danger: true, onSelect: () => setConfirm({ kind: 'delete-comment', group }) });
    }
    if (group.type === 'post' && live && 'title' in live) {
      if (live.published) {
        moderation.push({ label: 'პუბლიკაციიდან მოხსნა', icon: <EyeOff />, danger: true, onSelect: () => setConfirm({ kind: 'unpublish', group }) });
      }
      moderation.push({ label: 'სტატიის წაშლა', icon: <Trash2 />, danger: true, onSelect: () => setConfirm({ kind: 'delete-post', group }) });
    }
    if (group.type === 'user' && live && 'suspended' in live && !live.suspended) {
      moderation.push({ label: 'შეჩერება…', icon: <Ban />, danger: true, href: `/admin/users/${group.id}` });
    }
    if (moderation.length > 0) items.push(null, ...moderation);
    return items;
  }

  const dialog = (() => {
    if (!confirm) return null;
    const { group } = confirm;
    if (confirm.kind === 'delete-comment') {
      return {
        title: 'წავშალოთ კომენტარი?',
        description: 'კომენტარი და მასზე გაცემული ყველა პასუხი სამუდამოდ წაიშლება. საჩივრები მოგვარებულად მოინიშნება.',
        label: 'წაშლა',
        go: () => run(() => deleteCommentsAction([group.id]), () => 'კომენტარი წაიშალა'),
      };
    }
    if (confirm.kind === 'unpublish') {
      return {
        title: 'მოვხსნათ სტატია პუბლიკაციიდან?',
        description: 'სტატია მონახაზად გადაიქცევა და მხოლოდ ავტორი დაინახავს. საჩივრები მოგვარებულად მოინიშნება.',
        label: 'მოხსნა',
        go: () => run(() => unpublishPostsAction([group.id]), () => 'სტატია მოიხსნა პუბლიკაციიდან'),
      };
    }
    return {
      title: 'წავშალოთ სტატია?',
      description: 'სტატია, მისი კომენტარები და სტატისტიკა სამუდამოდ წაიშლება. საჩივრები მოგვარებულად მოინიშნება.',
      label: 'წაშლა',
      go: () => run(() => deletePostsAction([group.id]), () => 'სტატია წაიშალა'),
    };
  })();

  return (
    <>
      <BulkBar count={visible.length} onClear={() => setSelected(new Set())}>
        {openSelected.length > 0 ? (
          <>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => setStatus(openSelected, 'resolved')}>
              <Check />
              მოგვარებული
            </Button>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => setStatus(openSelected, 'dismissed')}>
              <X />
              უარყოფა
            </Button>
          </>
        ) : null}
        {closedSelected.length > 0 ? (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => setStatus(closedSelected, 'open')}>
            <RotateCcw />
            ხელახლა გახსნა
          </Button>
        ) : null}
      </BulkBar>

      <TableFrame>
        <thead className="border-b border-line bg-sunken">
          <tr>
            <th className={`${TH_CLASS} w-10`}>
              <Checkbox
                checked={allChecked}
                indeterminate={visible.length > 0 && !allChecked}
                onChange={() => setSelected(allChecked ? new Set() : new Set(groups.map((g) => g.key)))}
                label="ყველას მონიშვნა"
              />
            </th>
            <th className={TH_CLASS}>შინაარსი</th>
            <th className={TH_CLASS}>ავტორი</th>
            <th className={TH_CLASS}>მიზეზი</th>
            <th className={TH_CLASS}>ბოლოს</th>
            <th className={`${TH_CLASS} w-12`}>
              <span className="sr-only">მოქმედებები</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {groups.map((group) => {
            const isOpen = expanded.has(group.key);
            return (
              <Fragment key={group.key}>
                <tr className={selected.has(group.key) ? 'bg-accent-soft/40' : undefined}>
                  <td className={`${TD_CLASS} align-top`}>
                    <Checkbox
                      checked={selected.has(group.key)}
                      onChange={() => setSelected((s) => toggle(s, group.key))}
                      label="მონიშვნა"
                    />
                  </td>
                  <td className={`${TD_CLASS} max-w-md align-top`}>
                    <TargetCell group={group} />
                    <button
                      type="button"
                      onClick={() => setExpanded((s) => toggle(s, group.key))}
                      aria-expanded={isOpen}
                      className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-muted hover:text-ink"
                    >
                      <ChevronRight className={cn('size-3.5 transition-transform', isOpen && 'rotate-90')} />
                      {group.reports} საჩივარი
                      {group.open > 0 && group.open < group.reports ? ` · ${group.open} ღია` : ''}
                    </button>
                  </td>
                  <td className={`${TD_CLASS} align-top`}>
                    {group.owner ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={group.owner.name} src={group.owner.avatarUrl} size="xs" />
                        {group.owner.exists ? (
                          <Link
                            href={`/admin/users/${group.owner.id}`}
                            className="max-w-40 truncate text-muted hover:text-ink hover:underline"
                          >
                            {group.owner.name}
                          </Link>
                        ) : (
                          <span className="text-subtle">{group.owner.name}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-subtle">—</span>
                    )}
                  </td>
                  <td className={`${TD_CLASS} align-top`}>
                    <div className="flex max-w-56 flex-wrap gap-1">
                      {reasonCounts(group).map(([reason, count]) => (
                        <Badge key={reason} tone={group.open > 0 ? 'warning' : 'neutral'}>
                          {reasonLabel(reason)}
                          {count > 1 ? ` ×${count}` : ''}
                        </Badge>
                      ))}
                    </div>
                    {group.open === 0 ? (
                      <p className="mt-1.5 text-[12px] text-subtle">{REPORT_STATUS_LABELS[group.status]}</p>
                    ) : null}
                  </td>
                  <td className={`${TD_CLASS} align-top whitespace-nowrap text-muted`} title={formatDate(group.lastAt)}>
                    {timeAgo(group.lastAt)}
                  </td>
                  <td className={`${TD_CLASS} align-top`}>
                    <RowMenu items={menuFor(group)} />
                  </td>
                </tr>
                {isOpen ? (
                  <tr className="bg-sunken/60">
                    <td />
                    <td colSpan={5} className="px-3 pt-1 pb-4 pr-4">
                      <ul className="divide-y divide-line rounded-xl border border-line bg-raised">
                        {group.items.map((item) => (
                          <li key={item.id} className="px-3 py-2.5 text-[13px]">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <Badge tone={STATUS_TONES[item.status]}>{reasonLabel(item.reason)}</Badge>
                              {item.reporter ? (
                                <Link
                                  href={`/admin/users/${item.reporter.id}`}
                                  className="font-medium text-ink hover:underline"
                                >
                                  {item.reporter.name}
                                </Link>
                              ) : (
                                <span className="text-subtle">წაშლილი ანგარიში</span>
                              )}
                              <span className="text-subtle">{timeAgo(item.createdAt)}</span>
                              {item.status !== 'open' ? (
                                <span className="text-subtle">
                                  · {REPORT_STATUS_LABELS[item.status]}
                                  {item.resolverName ? ` (${item.resolverName})` : ''}
                                </span>
                              ) : null}
                            </div>
                            {item.details ? (
                              <p className="mt-1.5 whitespace-pre-line text-muted">{item.details}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </TableFrame>

      <FormDialog
        open={dialog !== null}
        title={dialog?.title ?? ''}
        description={dialog?.description}
        confirmLabel={dialog?.label ?? ''}
        pending={pending}
        onClose={() => !pending && setConfirm(null)}
        onConfirm={() => dialog?.go()}
      />
    </>
  );
}
