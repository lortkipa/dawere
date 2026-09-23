'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ExternalLink, Heart, Trash2, User } from 'lucide-react';
import { deleteCommentsAction } from '@/app/actions/admin';
import {
  BulkBar,
  Checkbox,
  FormDialog,
  RowMenu,
  TD_CLASS,
  TH_CLASS,
  TableFrame,
  useSelection,
} from '@/components/admin/controls';
import { toast } from '@/components/toaster';
import { Avatar, Badge, Button } from '@/components/ui';

export type CommentRow = {
  id: string;
  body: string;
  isReply: boolean;
  /** Replies at every depth: deleting the comment takes them all. */
  replies: number;
  likes: number;
  author: { id: string; name: string; username: string; avatarUrl: string | null };
  post: { id: string; title: string; slug: string; published: boolean };
  date: string;
};

export function CommentsTable({ rows }: { rows: CommentRow[] }) {
  const selection = useSelection(rows.map((r) => r.id));
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<string[] | null>(null);

  const replyCount = rows.filter((r) => confirm?.includes(r.id)).reduce((n, r) => n + r.replies, 0);

  return (
    <>
      <BulkBar count={selection.selected.length} onClear={selection.clear}>
        <Button variant="danger" size="sm" disabled={pending} onClick={() => setConfirm(selection.selected)}>
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
            <th className={TH_CLASS}>კომენტარი</th>
            <th className={TH_CLASS}>ავტორი</th>
            <th className={TH_CLASS}>სტატია</th>
            <th className={TH_CLASS}>თარიღი</th>
            <th className={`${TH_CLASS} w-12`}>
              <span className="sr-only">მოქმედებები</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id} className={selection.has(row.id) ? 'bg-accent-soft/40' : undefined}>
              <td className={`${TD_CLASS} align-top`}>
                <Checkbox
                  checked={selection.has(row.id)}
                  onChange={() => selection.toggle(row.id)}
                  label="კომენტარის მონიშვნა"
                />
              </td>
              <td className={`${TD_CLASS} max-w-md align-top`}>
                <p className="line-clamp-3 whitespace-pre-line text-ink">{row.body}</p>
                {row.isReply || row.replies > 0 || row.likes > 0 ? (
                  <div className="mt-1 flex gap-1">
                    {row.isReply ? <Badge>პასუხი</Badge> : null}
                    {row.replies > 0 ? <Badge>{row.replies} პასუხი</Badge> : null}
                    {row.likes > 0 ? (
                      <Badge>
                        <Heart />
                        {row.likes}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
              </td>
              <td className={`${TD_CLASS} align-top`}>
                <div className="flex items-center gap-2">
                  <Avatar name={row.author.name} src={row.author.avatarUrl} size="xs" />
                  <Link
                    href={`/admin/users/${row.author.id}`}
                    className="max-w-40 truncate text-muted hover:text-ink hover:underline"
                  >
                    {row.author.name}
                  </Link>
                </div>
              </td>
              <td className={`${TD_CLASS} max-w-56 align-top`}>
                <Link
                  href={`/admin/comments?post=${row.post.id}`}
                  className="line-clamp-2 text-muted hover:text-ink hover:underline"
                >
                  {row.post.title || 'უსათაურო'}
                </Link>
              </td>
              <td className={`${TD_CLASS} align-top whitespace-nowrap text-muted`}>{row.date}</td>
              <td className={`${TD_CLASS} align-top`}>
                <RowMenu
                  items={[
                    ...(row.post.published
                      ? [{ label: 'სტატიაში ნახვა', icon: <ExternalLink />, href: `/p/${row.post.slug}#comment-${row.id}` }]
                      : []),
                    { label: 'ავტორი', icon: <User />, href: `/admin/users/${row.author.id}` },
                    null,
                    { label: 'წაშლა', icon: <Trash2 />, danger: true, onSelect: () => setConfirm([row.id]) },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </TableFrame>

      <FormDialog
        open={confirm !== null}
        title={confirm && confirm.length > 1 ? `წავშალოთ ${confirm.length} კომენტარი?` : 'წავშალოთ კომენტარი?'}
        description={
          replyCount > 0
            ? `მასზე გაცემული პასუხებიც (${replyCount}) წაიშლება.`
            : 'კომენტარი სამუდამოდ წაიშლება.'
        }
        confirmLabel="წაშლა"
        pending={pending}
        onClose={() => !pending && setConfirm(null)}
        onConfirm={() => {
          const ids = confirm ?? [];
          startTransition(async () => {
            const result = await deleteCommentsAction(ids);
            setConfirm(null);
            if (!result.ok) {
              toast(result.error ?? 'ვერ მოხერხდა.', 'error');
              return;
            }
            selection.clear();
            toast(result.count === 1 ? 'კომენტარი წაიშალა' : `წაიშალა ${result.count ?? 0} კომენტარი`);
          });
        }}
      />
    </>
  );
}
