'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { EyeOff, ExternalLink, PenLine, Send, Trash2, User } from 'lucide-react';
import {
  deletePostsAction,
  publishPostAdminAction,
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
  useSelection,
  type MenuItem,
} from '@/components/admin/controls';
import { toast } from '@/components/toaster';
import { Badge, Button } from '@/components/ui';
import { formatCount } from '@/lib/utils';

export type PostRow = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  hasPending: boolean;
  author: { id: string; name: string; username: string };
  views: number;
  likes: number;
  comments: number;
  /** Published date for live posts, last edit for drafts; formatted on the server. */
  date: string;
};

/**
 * Publish, unpublish and delete for any post, one at a time or in bulk. Also
 * used on a single post's admin page, where `onDeleted` leaves the page.
 */
export function usePostActions({ onDeleted }: { onDeleted?: () => void } = {}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);

  function run(action: () => Promise<AdminResult>, message: (r: AdminResult) => string, done?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast(result.error ?? 'ვერ მოხერხდა.', 'error');
        return;
      }
      toast(message(result));
      done?.();
    });
  }

  const act = {
    publish: (id: string) => run(() => publishPostAdminAction(id), () => 'სტატია გამოქვეყნდა'),
    unpublish: (ids: string[]) =>
      run(
        () => unpublishPostsAction(ids),
        (r) => (r.count === 1 ? 'სტატია მოიხსნა' : `მოიხსნა ${r.count ?? 0} სტატია`),
      ),
    delete: (ids: string[]) => setConfirmDelete(ids),
  };

  const dialogs = (
    <FormDialog
      open={confirmDelete !== null}
      title={confirmDelete && confirmDelete.length > 1 ? `წავშალოთ ${confirmDelete.length} სტატია?` : 'წავშალოთ სტატია?'}
      description="სტატია, მისი კომენტარები და სტატისტიკა სამუდამოდ წაიშლება. თუ მხოლოდ დამალვა გინდა, მოხსენი პუბლიკაციიდან."
      confirmLabel="წაშლა"
      pending={pending}
      onClose={() => !pending && setConfirmDelete(null)}
      onConfirm={() => {
        const ids = confirmDelete ?? [];
        run(
          () => deletePostsAction(ids),
          (r) => (r.count === 1 ? 'სტატია წაიშალა' : `წაიშალა ${r.count ?? 0} სტატია`),
          () => {
            setConfirmDelete(null);
            onDeleted?.();
          },
        );
      }}
    />
  );

  return { act, dialogs, pending };
}

export function PostsTable({ rows }: { rows: PostRow[] }) {
  const selection = useSelection(rows.map((r) => r.id));
  const { act, dialogs, pending } = usePostActions({ onDeleted: selection.clear });
  const anyPublished = rows.some((r) => r.published && selection.has(r.id));

  function menu(row: PostRow): (MenuItem | null)[] {
    return [
      { label: 'რედაქტირება', icon: <PenLine />, href: `/admin/posts/${row.id}` },
      ...(row.published ? [{ label: 'საიტზე ნახვა', icon: <ExternalLink />, href: `/p/${row.slug}` }] : []),
      { label: 'ავტორი', icon: <User />, href: `/admin/users/${row.author.id}` },
      null,
      row.published
        ? { label: 'პუბლიკაციიდან მოხსნა', icon: <EyeOff />, onSelect: () => act.unpublish([row.id]) }
        : { label: 'გამოქვეყნება', icon: <Send />, onSelect: () => act.publish(row.id) },
      { label: 'წაშლა', icon: <Trash2 />, danger: true, onSelect: () => act.delete([row.id]) },
    ];
  }

  return (
    <>
      <BulkBar count={selection.selected.length} onClear={selection.clear}>
        {anyPublished ? (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => act.unpublish(selection.selected)}>
            <EyeOff />
            პუბლიკაციიდან მოხსნა
          </Button>
        ) : null}
        <Button variant="danger" size="sm" disabled={pending} onClick={() => act.delete(selection.selected)}>
          <Trash2 />
          წაშლა
        </Button>
      </BulkBar>

      <TableFrame>
        <thead className="border-b border-line bg-sunken">
          <tr>
            <th className={`${TH_CLASS} w-10`}>
              <Checkbox
                checked={selection.allChecked}
                indeterminate={selection.someChecked}
                onChange={selection.toggleAll}
                label="ყველას მონიშვნა"
              />
            </th>
            <th className={TH_CLASS}>სტატია</th>
            <th className={TH_CLASS}>სტატუსი</th>
            <th className={`${TH_CLASS} text-right`}>ნახვები</th>
            <th className={`${TH_CLASS} text-right`}>მოწონებები</th>
            <th className={`${TH_CLASS} text-right`}>კომენტარები</th>
            <th className={TH_CLASS}>თარიღი</th>
            <th className={`${TH_CLASS} w-12`}>
              <span className="sr-only">მოქმედებები</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id} className={selection.has(row.id) ? 'bg-accent-soft/40' : undefined}>
              <td className={TD_CLASS}>
                <Checkbox
                  checked={selection.has(row.id)}
                  onChange={() => selection.toggle(row.id)}
                  label={`${row.title || 'უსათაურო'} — მონიშვნა`}
                />
              </td>
              <td className={`${TD_CLASS} max-w-md`}>
                <Link href={`/admin/posts/${row.id}`} className="line-clamp-1 font-medium text-ink hover:underline">
                  {row.title || 'უსათაურო'}
                </Link>
                <Link
                  href={`/admin/posts?author=${row.author.id}`}
                  className="block truncate text-[12px] text-subtle hover:text-ink"
                >
                  {row.author.name} · @{row.author.username}
                </Link>
              </td>
              <td className={TD_CLASS}>
                <div className="flex flex-wrap gap-1">
                  {row.published ? <Badge tone="accent">გამოქვეყნებული</Badge> : <Badge>მონახაზი</Badge>}
                  {row.hasPending ? <Badge tone="warning">ცვლილებები</Badge> : null}
                </div>
              </td>
              <td className={`${TD_CLASS} text-right text-muted tabular-nums`}>{formatCount(row.views)}</td>
              <td className={`${TD_CLASS} text-right text-muted tabular-nums`}>{formatCount(row.likes)}</td>
              <td className={`${TD_CLASS} text-right text-muted tabular-nums`}>{formatCount(row.comments)}</td>
              <td className={`${TD_CLASS} whitespace-nowrap text-muted`}>{row.date}</td>
              <td className={TD_CLASS}>
                <RowMenu items={menu(row)} />
              </td>
            </tr>
          ))}
        </tbody>
      </TableFrame>

      {dialogs}
    </>
  );
}
