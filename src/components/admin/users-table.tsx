'use client';

import Link from 'next/link';
import {
  Ban,
  ExternalLink,
  FileText,
  KeyRound,
  LogOut,
  MessageSquare,
  PenLine,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from 'lucide-react';
import {
  BulkBar,
  Checkbox,
  RowMenu,
  TD_CLASS,
  TH_CLASS,
  TableFrame,
  useSelection,
  type MenuItem,
} from '@/components/admin/controls';
import { useUserActions } from '@/components/admin/user-actions';
import { Avatar, Badge, Button } from '@/components/ui';
import type { Access } from '@/db/schema';
import { formatCount } from '@/lib/utils';

export type UserRow = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  access: Access;
  suspended: boolean;
  suspendedReason: string;
  /** Pre-formatted on the server, so both sides render the same text. */
  joined: string;
  published: number;
  drafts: number;
  comments: number;
  /** Whether the viewing admin may act on this account at all. */
  manageable: boolean;
};

export function UsersTable({ rows, actorIsSuper }: { rows: UserRow[]; actorIsSuper: boolean }) {
  const selection = useSelection(rows.filter((r) => r.manageable).map((r) => r.id));
  const { act, dialogs, pending } = useUserActions({ onDeleted: selection.clear });

  const chosen = rows.filter((r) => selection.has(r.id));
  const anySuspended = chosen.some((r) => r.suspended);
  const anyActive = chosen.some((r) => !r.suspended);

  function menu(row: UserRow): (MenuItem | null)[] {
    const items: (MenuItem | null)[] = [
      { label: 'მართვა', icon: <PenLine />, href: `/admin/users/${row.id}` },
      { label: 'სტატიები', icon: <FileText />, href: `/admin/posts?author=${row.id}` },
      { label: 'კომენტარები', icon: <MessageSquare />, href: `/admin/comments?author=${row.id}` },
      { label: 'საჯარო პროფილი', icon: <ExternalLink />, href: `/u/${row.username}` },
    ];
    if (!row.manageable) return items;

    items.push(null);
    if (actorIsSuper) {
      items.push(
        row.access === 'admin'
          ? { label: 'ადმინობიდან მოხსნა', icon: <ShieldOff />, onSelect: () => act.demote(row.id, row.name) }
          : { label: 'ადმინად დანიშვნა', icon: <ShieldCheck />, onSelect: () => act.promote(row.id) },
      );
    }
    items.push(
      { label: 'პაროლის შეცვლა', icon: <KeyRound />, onSelect: () => act.resetPassword(row.id, row.username) },
      { label: 'ყველგან გამოსვლა', icon: <LogOut />, onSelect: () => act.signOut(row.id) },
      row.suspended
        ? { label: 'აღდგენა', icon: <RotateCcw />, onSelect: () => act.unsuspend([row.id]) }
        : { label: 'შეჩერება', icon: <Ban />, onSelect: () => act.suspend([row.id]) },
      null,
      { label: 'წაშლა', icon: <Trash2 />, danger: true, onSelect: () => act.delete([row.id]) },
    );
    return items;
  }

  return (
    <>
      <BulkBar count={selection.selected.length} onClear={selection.clear}>
        {anyActive ? (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => act.suspend(selection.selected)}>
            <Ban />
            შეჩერება
          </Button>
        ) : null}
        {anySuspended ? (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => act.unsuspend(selection.selected)}>
            <RotateCcw />
            აღდგენა
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
            <th className={TH_CLASS}>მომხმარებელი</th>
            <th className={TH_CLASS}>ელფოსტა</th>
            <th className={`${TH_CLASS} text-right`}>სტატიები</th>
            <th className={`${TH_CLASS} text-right`}>კომენტარები</th>
            <th className={TH_CLASS}>დარეგისტრირდა</th>
            <th className={`${TH_CLASS} w-12`}>
              <span className="sr-only">მოქმედებები</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.id} className={selection.has(row.id) ? 'bg-accent-soft/40' : undefined}>
              <td className={TD_CLASS}>
                {row.manageable ? (
                  <Checkbox
                    checked={selection.has(row.id)}
                    onChange={() => selection.toggle(row.id)}
                    label={`${row.name} — მონიშვნა`}
                  />
                ) : null}
              </td>
              <td className={TD_CLASS}>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={row.name} src={row.avatarUrl} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/users/${row.id}`}
                        className="truncate font-medium text-ink hover:underline"
                      >
                        {row.name}
                      </Link>
                      {row.access === 'super_admin' ? <Badge tone="accent">სუპერადმინი</Badge> : null}
                      {row.access === 'admin' ? <Badge tone="accent">ადმინი</Badge> : null}
                      {row.suspended ? <Badge tone="danger">შეჩერებული</Badge> : null}
                    </div>
                    <p className="truncate text-[12px] text-subtle" title={row.suspendedReason || undefined}>
                      @{row.username}
                    </p>
                  </div>
                </div>
              </td>
              <td className={`${TD_CLASS} max-w-56 truncate text-muted`}>{row.email}</td>
              <td className={`${TD_CLASS} text-right text-muted tabular-nums`}>
                {formatCount(row.published)}
                {row.drafts > 0 ? <span className="text-subtle"> +{row.drafts}</span> : null}
              </td>
              <td className={`${TD_CLASS} text-right text-muted tabular-nums`}>{formatCount(row.comments)}</td>
              <td className={`${TD_CLASS} whitespace-nowrap text-muted`}>{row.joined}</td>
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
