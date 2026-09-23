'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Crown, Loader2, ShieldOff, UserPlus } from 'lucide-react';
import { addAdminAction, transferSuperAdminAction } from '@/app/actions/admin';
import { useUserActions } from '@/components/admin/user-actions';
import { Button, Field, FormError, INPUT_CLASS, Input } from '@/components/ui';
import type { FormState } from '@/lib/validation';
import { cn } from '@/lib/utils';

function Submit({ label, icon, variant }: { label: string; icon: React.ReactNode; variant?: 'primary' | 'danger' }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : icon}
      {label}
    </Button>
  );
}

export function AddAdminForm() {
  const [state, formAction] = useActionState(addAdminAction, { ok: false } as FormState);
  const error = state.fieldErrors?.who;

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <label htmlFor="who" className="sr-only">
            ელფოსტა ან მომხმარებლის სახელი
          </label>
          <Input
            id="who"
            name="who"
            key={state.ok ? 'reset' : 'keep'}
            defaultValue={state.values?.who}
            placeholder="ელფოსტა ან @მომხმარებელი"
            aria-invalid={Boolean(error)}
            required
          />
        </div>
        <Submit label="დანიშვნა" icon={<UserPlus />} />
      </div>
      {error ? (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-[13px] text-accent">
          დაინიშნა ადმინად.
        </p>
      ) : null}
    </form>
  );
}

export function RemoveAdminButton({ id, name }: { id: string; name: string }) {
  const { act, dialogs, pending } = useUserActions();
  return (
    <>
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => act.demote(id, name)}>
        <ShieldOff />
        მოხსნა
      </Button>
      {dialogs}
    </>
  );
}

export function TransferForm({ admins }: { admins: { id: string; name: string; username: string }[] }) {
  const [state, formAction] = useActionState(transferSuperAdminAction, { ok: false } as FormState);
  const errors = state.fieldErrors ?? {};

  if (admins.length === 0) {
    return (
      <p className="text-[13px] text-muted">
        სუპერადმინობის გადასაცემად ჯერ დანიშნე ვინმე ადმინად.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ახალი სუპერადმინი" htmlFor="transfer-user" error={errors.userId}>
          <select id="transfer-user" name="userId" required defaultValue="" className={cn(INPUT_CLASS, 'h-10')}>
            <option value="" disabled>
              აირჩიე ადმინი
            </option>
            {admins.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.name} (@{admin.username})
              </option>
            ))}
          </select>
        </Field>
        <Field label="შენი პაროლი" htmlFor="transfer-password" error={errors.password}>
          <Input id="transfer-password" name="password" type="password" autoComplete="current-password" required />
        </Field>
      </div>
      {state.error ? <FormError>{state.error}</FormError> : null}
      <Submit label="სუპერადმინობის გადაცემა" icon={<Crown />} variant="danger" />
    </form>
  );
}
