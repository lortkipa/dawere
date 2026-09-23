'use client';

import { useState, useTransition } from 'react';
import {
  deleteUsersAction,
  resetUserPasswordAction,
  setAccessAction,
  signOutUserAction,
  suspendUsersAction,
  unsuspendUsersAction,
  type AdminResult,
} from '@/app/actions/admin';
import { FormDialog, SecretDialog } from '@/components/admin/controls';
import { toast } from '@/components/toaster';
import { Field, INPUT_CLASS, Input } from '@/components/ui';

type Pending =
  | { kind: 'suspend'; ids: string[] }
  | { kind: 'delete'; ids: string[] }
  | { kind: 'reset'; id: string; username: string }
  | { kind: 'demote'; id: string; name: string };

const plural = (n: number) => (n === 1 ? 'ანგარიში' : `${n} ანგარიში`);

/**
 * Every account-level action an admin can take, with its confirmations, in one
 * place: the users table and a user's own admin page both render `dialogs` and
 * call into `act`. Actions revalidate on the server, so the page re-renders
 * in the same round trip and nothing here refetches.
 */
export function useUserActions({ onDeleted }: { onDeleted?: () => void } = {}) {
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<Pending | null>(null);
  const [error, setError] = useState<string>();
  const [secret, setSecret] = useState<{ password: string; username: string } | null>(null);

  function close() {
    if (pending) return;
    setDialog(null);
    setError(undefined);
  }

  /** Runs an action; a refusal stays in the open dialog, or becomes a toast if none is open. */
  function run(action: () => Promise<AdminResult>, success: (result: AdminResult) => string | null, done?: () => void) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        if (dialog) setError(result.error ?? 'ვერ მოხერხდა.');
        else toast(result.error ?? 'ვერ მოხერხდა.', 'error');
        return;
      }
      setDialog(null);
      const message = success(result);
      if (message) toast(message);
      // Partial success (some rows skipped) arrives as ok plus a note.
      if (result.error) toast(result.error, 'info');
      done?.();
    });
  }

  const act = {
    suspend: (ids: string[]) => setDialog({ kind: 'suspend', ids }),
    unsuspend: (ids: string[]) =>
      run(
        () => unsuspendUsersAction(ids),
        (r) => (r.count ? `${plural(r.count ?? 0)} აღდგა` : 'აღსადგენი არაფერია'),
      ),
    delete: (ids: string[]) => setDialog({ kind: 'delete', ids }),
    resetPassword: (id: string, username: string) => setDialog({ kind: 'reset', id, username }),
    signOut: (id: string) =>
      run(
        () => signOutUserAction(id),
        (r) => (r.count ? `დასრულდა ${r.count} სესია` : 'აქტიური სესია არ ჰქონდა'),
      ),
    promote: (id: string) => run(() => setAccessAction(id, 'admin'), () => 'დაინიშნა ადმინად'),
    demote: (id: string, name: string) => setDialog({ kind: 'demote', id, name }),
  };

  const dialogs = (
    <>
      <FormDialog
        open={dialog?.kind === 'suspend'}
        title={dialog?.kind === 'suspend' && dialog.ids.length > 1 ? `შევაჩეროთ ${dialog.ids.length} ანგარიში?` : 'შევაჩეროთ ანგარიში?'}
        description="შეჩერებული ანგარიში ვეღარ შევა საიტზე და მისი ყველა სესია დასრულდება. მონაცემები არ წაიშლება; ნებისმიერ დროს შეგიძლია აღადგინო."
        confirmLabel="შეჩერება"
        pending={pending}
        error={error}
        onClose={close}
        onConfirm={(data) => {
          if (dialog?.kind !== 'suspend') return;
          const ids = dialog.ids;
          run(
            () =>
              suspendUsersAction(ids, {
                reason: String(data.get('reason') ?? ''),
                unpublish: data.get('unpublish') === 'on',
              }),
            (r) => `${plural(r.count ?? 0)} შეჩერდა`,
          );
        }}
      >
        <Field label="მიზეზი" hint="ნახავს შესვლისას" htmlFor="suspend-reason">
          <Input id="suspend-reason" name="reason" maxLength={200} placeholder="მაგ.: სპამი" />
        </Field>
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input type="checkbox" name="unpublish" className="mt-1 size-4 accent-[var(--accent)]" />
          <span>
            სტატიების მოხსნაც
            <span className="block text-[13px] text-muted">გამოქვეყნებული სტატიები მონახაზებად იქცევა.</span>
          </span>
        </label>
      </FormDialog>

      <FormDialog
        open={dialog?.kind === 'delete'}
        title={dialog?.kind === 'delete' && dialog.ids.length > 1 ? `წავშალოთ ${dialog.ids.length} ანგარიში?` : 'წავშალოთ ანგარიში?'}
        description="ანგარიში, მისი სტატიები, კომენტარები და ატვირთული სურათები სამუდამოდ წაიშლება. ამას ვერ დააბრუნებ."
        confirmLabel="სამუდამოდ წაშლა"
        pending={pending}
        error={error}
        onClose={close}
        onConfirm={(data) => {
          if (dialog?.kind !== 'delete') return;
          const ids = dialog.ids;
          run(
            () => deleteUsersAction(ids, String(data.get('password') ?? '')),
            (r) => `${plural(r.count ?? 0)} წაიშალა`,
            onDeleted,
          );
        }}
      >
        <Field label="შენი პაროლი" htmlFor="delete-password">
          <input
            id="delete-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={`${INPUT_CLASS} h-10`}
          />
        </Field>
      </FormDialog>

      <FormDialog
        open={dialog?.kind === 'reset'}
        title="ახალი პაროლი?"
        description={
          <>
            {dialog?.kind === 'reset' ? `@${dialog.username}` : ''}-ს ძველი პაროლი აღარ იმუშავებს და ყველა მოწყობილობიდან
            გამოვა. ახალ პაროლს ერთხელ გაჩვენებ — გადაეცი პირადად.
          </>
        }
        confirmLabel="პაროლის შეცვლა"
        tone="primary"
        pending={pending}
        error={error}
        onClose={close}
        onConfirm={() => {
          if (dialog?.kind !== 'reset') return;
          const { id, username } = dialog;
          run(
            () => resetUserPasswordAction(id),
            (r) => {
              if (r.password) setSecret({ password: r.password, username });
              return null;
            },
          );
        }}
      />

      <FormDialog
        open={dialog?.kind === 'demote'}
        title="მოვხსნათ ადმინობიდან?"
        description={
          dialog?.kind === 'demote' ? `${dialog.name} ჩვეულებრივი წევრი გახდება და ადმინისტრირებას ვეღარ შეძლებს.` : null
        }
        confirmLabel="მოხსნა"
        pending={pending}
        error={error}
        onClose={close}
        onConfirm={() => {
          if (dialog?.kind !== 'demote') return;
          const id = dialog.id;
          run(() => setAccessAction(id, 'user'), () => 'მოიხსნა ადმინობიდან');
        }}
      />

      <SecretDialog
        secret={secret?.password ?? null}
        title="ახალი პაროლი"
        description={<>გადაეცი @{secret?.username}-ს პირადად და სთხოვე, პარამეტრებში შეცვალოს.</>}
        onClose={() => setSecret(null)}
      />
    </>
  );

  return { act, dialogs, pending };
}
