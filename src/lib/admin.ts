import 'server-only';

import { randomBytes } from 'node:crypto';
import { db } from '@/db';
import { adminLog, type Access, type User } from '@/db/schema';

type Person = { id: string; access: Access };

/**
 * Whether `actor` may edit, suspend, sign out or delete `target` from /admin.
 *
 * - Nobody manages the super admin: the seat changes hands only by transfer.
 * - Nobody manages themselves here; their own account lives in Settings, and
 *   an admin who suspends or demotes themselves by accident has no way back.
 * - Admins manage members; only the super admin manages other admins.
 */
export function canManage(actor: Person, target: Person): boolean {
  if (target.access === 'super_admin') return false;
  if (actor.id === target.id) return false;
  if (target.access === 'admin') return actor.access === 'super_admin';
  return actor.access === 'admin' || actor.access === 'super_admin';
}

export type AdminAction =
  | 'user.create'
  | 'user.update'
  | 'user.remove_avatar'
  | 'user.suspend'
  | 'user.unsuspend'
  | 'user.delete'
  | 'user.reset_password'
  | 'user.sign_out'
  | 'user.promote'
  | 'user.demote'
  | 'user.transfer_super_admin'
  | 'post.update'
  | 'post.publish'
  | 'post.unpublish'
  | 'post.discard_pending'
  | 'post.delete'
  | 'comment.delete'
  | 'topic.create'
  | 'topic.update'
  | 'topic.delete';

export const ACTION_LABELS: Record<AdminAction, string> = {
  'user.create': 'შექმნა ანგარიში',
  'user.update': 'შეცვალა პროფილი',
  'user.remove_avatar': 'წაშალა პროფილის სურათი',
  'user.suspend': 'შეაჩერა ანგარიში',
  'user.unsuspend': 'აღადგინა ანგარიში',
  'user.delete': 'წაშალა ანგარიში',
  'user.reset_password': 'გადააყენა პაროლი',
  'user.sign_out': 'გამოიყვანა ყველა მოწყობილობიდან',
  'user.promote': 'დანიშნა ადმინად',
  'user.demote': 'მოხსნა ადმინობიდან',
  'user.transfer_super_admin': 'გადასცა სუპერადმინობა',
  'post.update': 'შეცვალა სტატია',
  'post.publish': 'გამოაქვეყნა სტატია',
  'post.unpublish': 'მოხსნა სტატია პუბლიკაციიდან',
  'post.discard_pending': 'გააუქმა ავტორის გამოუქვეყნებელი ცვლილებები',
  'post.delete': 'წაშალა სტატია',
  'comment.delete': 'წაშალა კომენტარი',
  'topic.create': 'შექმნა თემა',
  'topic.update': 'შეცვალა თემა',
  'topic.delete': 'წაშალა თემა',
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action as AdminAction] ?? action;
}

/**
 * Records one admin change. Awaited by callers on purpose: if the log cannot
 * be written, the request fails loudly rather than leaving an unexplained edit.
 */
export async function logAdmin(
  actor: Pick<User, 'id' | 'name'>,
  action: AdminAction,
  target: { type: 'user' | 'post' | 'comment' | 'topic'; id?: string | null; label?: string },
  details?: Record<string, unknown>,
) {
  await db.insert(adminLog).values({
    actorId: actor.id,
    actorName: actor.name,
    action,
    targetType: target.type,
    targetId: target.id ?? null,
    targetLabel: (target.label ?? '').slice(0, 200),
    details: details ?? null,
  });
}

/** A readable one-time password: 16 characters, no look-alikes to misread aloud. */
export function generatePassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(16);
  let out = '';
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12)}`;
}

export const ACCESS_LABELS: Record<Access, string> = {
  user: 'წევრი',
  admin: 'ადმინი',
  super_admin: 'სუპერადმინი',
};

/** A LIKE pattern for a user-typed search, with its wildcards escaped. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

type SearchParams = Record<string, string | string[] | undefined>;

/** A single string per parameter, trimmed; arrays (a repeated key) keep the first. */
export function readParams(searchParams: SearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === 'string' && first.trim()) out[key] = first.trim().slice(0, 200);
  }
  return out;
}

/** `value` if it is one of `allowed`, else the first allowed value (the default). */
export function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T {
  return allowed.includes(value as T) ? (value as T) : allowed[0];
}

/** The list's own URL with the given parameters, for pagination links. */
export function listHref(path: string, params: Record<string, string>): string {
  const query = new URLSearchParams(Object.entries(params).filter(([key, v]) => v && key !== 'page')).toString();
  return query ? `${path}?${query}` : path;
}

export const PAGE_SIZE = 25;

/** `params` without the named keys: the filter state a list hands its controls. */
export function omit(params: Record<string, string>, ...keys: string[]): Record<string, string> {
  return Object.fromEntries(Object.entries(params).filter(([key]) => !keys.includes(key)));
}
