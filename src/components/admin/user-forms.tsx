'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Ban,
  Check,
  ImageOff,
  KeyRound,
  Loader2,
  LogOut,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { createUserAction, removeUserAvatarAction, type CreateUserState } from '@/app/actions/admin';
import { SecretDialog } from '@/components/admin/controls';
import { useUserActions } from '@/components/admin/user-actions';
import { toast } from '@/components/toaster';
import { Button, Card, Field, FormError, Input, Textarea, INPUT_CLASS } from '@/components/ui';
import type { FormState } from '@/lib/validation';
import { cn } from '@/lib/utils';

function Submit({ label, icon }: { label: string; icon?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : icon}
      {label}
    </Button>
  );
}

export function AdminSection({
  title,
  description,
  tone,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  tone?: 'danger';
  children: React.ReactNode;
}) {
  return (
    <Card className={cn('p-5 sm:p-6', tone === 'danger' && 'border-danger/30')}>
      <h2 className={cn('text-[15px] font-semibold tracking-tight', tone === 'danger' && 'text-danger')}>{title}</h2>
      {description ? <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

type Profile = { name: string; username: string; email: string; bio: string; location: string; website: string };

/** The profile fields, as the member sees them in Settings, plus the email. */
export function EditUserForm({
  initial,
  action,
  disabled,
}: {
  initial: Profile;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  disabled: boolean;
}) {
  const [state, formAction] = useActionState(action, { ok: false } as FormState);
  const errors = state.fieldErrors ?? {};
  const v = { ...initial, ...state.values };

  return (
    <form action={formAction} className="space-y-4">
      <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
        <Field label="სახელი" htmlFor="name" error={errors.name}>
          <Input id="name" name="name" defaultValue={v.name} required maxLength={60} aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field label="მომხმარებლის სახელი" htmlFor="username" error={errors.username}>
          <Input
            id="username"
            name="username"
            defaultValue={v.username}
            required
            maxLength={30}
            aria-invalid={Boolean(errors.username)}
          />
        </Field>
        <Field label="ელფოსტა" htmlFor="email" error={errors.email} className="sm:col-span-2">
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={v.email}
            required
            aria-invalid={Boolean(errors.email)}
          />
        </Field>
        <Field label="ბიოგრაფია" htmlFor="bio" error={errors.bio} className="sm:col-span-2">
          <Textarea id="bio" name="bio" defaultValue={v.bio} rows={3} maxLength={280} />
        </Field>
        <Field label="მდებარეობა" htmlFor="location" error={errors.location}>
          <Input id="location" name="location" defaultValue={v.location} maxLength={80} />
        </Field>
        <Field label="ვებგვერდი" htmlFor="website" error={errors.website}>
          <Input id="website" name="website" defaultValue={v.website} maxLength={200} placeholder="https://" />
        </Field>
      </fieldset>

      {state.error ? <FormError>{state.error}</FormError> : null}

      {disabled ? null : (
        <div className="flex items-center gap-3">
          <Submit label="შენახვა" />
          {state.ok ? (
            <p role="status" className="inline-flex items-center gap-1.5 text-sm text-accent">
              <Check className="size-4" />
              შენახულია
            </p>
          ) : null}
        </div>
      )}
    </form>
  );
}

/** Access, sessions, password, suspension and deletion for one account. */
export function AccountControls({
  user,
  actorIsSuper,
}: {
  user: { id: string; name: string; username: string; access: string; suspended: boolean; hasAvatar: boolean };
  actorIsSuper: boolean;
}) {
  const router = useRouter();
  const { act, dialogs, pending } = useUserActions({ onDeleted: () => router.push('/admin/users') });
  const [removing, startRemove] = useTransition();

  return (
    <div className="space-y-4">
      {actorIsSuper ? (
        <AdminSection
          title="როლი"
          description={
            user.access === 'admin'
              ? 'ადმინი მართავს წევრებს, სტატიებს, კომენტარებსა და თემებს.'
              : 'ადმინად დანიშვნა მისცემს ამ ანგარიშს წვდომას ადმინისტრირებაზე.'
          }
        >
          {user.access === 'admin' ? (
            <Button variant="outline" disabled={pending} onClick={() => act.demote(user.id, user.name)}>
              <ShieldOff />
              ადმინობიდან მოხსნა
            </Button>
          ) : (
            <Button variant="outline" disabled={pending || user.suspended} onClick={() => act.promote(user.id)}>
              <ShieldCheck />
              ადმინად დანიშვნა
            </Button>
          )}
        </AdminSection>
      ) : null}

      <AdminSection title="შესვლა" description="დავიწყებული პაროლი ან ანგარიში, რომელიც სხვის ხელშია.">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={pending} onClick={() => act.resetPassword(user.id, user.username)}>
            <KeyRound />
            ახალი პაროლი
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => act.signOut(user.id)}>
            <LogOut />
            ყველგან გამოსვლა
          </Button>
          {user.hasAvatar ? (
            <Button
              variant="outline"
              disabled={removing}
              onClick={() =>
                startRemove(async () => {
                  const result = await removeUserAvatarAction(user.id);
                  toast(result.ok ? 'სურათი წაიშალა' : (result.error ?? 'ვერ მოხერხდა.'), result.ok ? 'success' : 'error');
                })
              }
            >
              <ImageOff />
              სურათის წაშლა
            </Button>
          ) : null}
        </div>
      </AdminSection>

      <AdminSection title="საფრთხის ზონა" tone="danger">
        <div className="flex flex-wrap gap-2">
          {user.suspended ? (
            <Button variant="outline" disabled={pending} onClick={() => act.unsuspend([user.id])}>
              <RotateCcw />
              აღდგენა
            </Button>
          ) : (
            <Button variant="outline" disabled={pending} onClick={() => act.suspend([user.id])}>
              <Ban />
              შეჩერება
            </Button>
          )}
          <Button variant="danger" disabled={pending} onClick={() => act.delete([user.id])}>
            <Trash2 />
            ანგარიშის წაშლა
          </Button>
        </div>
      </AdminSection>

      {dialogs}
    </div>
  );
}

export function CreateUserForm({ canAppointAdmins }: { canAppointAdmins: boolean }) {
  const [state, formAction] = useActionState(createUserAction, { ok: false } as CreateUserState);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [shownFor, setShownFor] = useState<string | undefined>();
  const errors = state.fieldErrors ?? {};
  const v = state.ok ? {} : (state.values ?? {});

  // A new generated password opens the reveal dialog once.
  if (state.ok && state.password && shownFor !== state.userId) {
    setShownFor(state.userId);
    setRevealed(state.password);
  }

  return (
    <>
      {state.ok ? (
        <div role="status" className="mb-6 rounded-xl border border-accent/25 bg-accent-soft px-4 py-3 text-sm text-ink">
          ანგარიში შეიქმნა: <strong>@{state.username}</strong>.{' '}
          <Link href={`/admin/users/${state.userId}`} className="font-medium text-accent hover:underline">
            გახსნა
          </Link>
        </div>
      ) : null}

      <form action={formAction} key={state.ok ? state.userId : 'form'} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="სახელი" htmlFor="name" error={errors.name}>
            <Input id="name" name="name" defaultValue={v.name} required maxLength={60} aria-invalid={Boolean(errors.name)} />
          </Field>
          <Field label="ელფოსტა" htmlFor="email" error={errors.email}>
            <Input id="email" name="email" type="email" defaultValue={v.email} required aria-invalid={Boolean(errors.email)} />
          </Field>
          <Field label="მომხმარებლის სახელი" hint="არჩევითი" htmlFor="username" error={errors.username}>
            <Input
              id="username"
              name="username"
              defaultValue={v.username}
              maxLength={30}
              placeholder="სახელიდან შეიქმნება"
              aria-invalid={Boolean(errors.username)}
            />
          </Field>
          <Field label="პაროლი" hint="არჩევითი" htmlFor="password" error={errors.password}>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="შემთხვევითი შეიქმნება"
              aria-invalid={Boolean(errors.password)}
            />
          </Field>
          {canAppointAdmins ? (
            <Field label="როლი" htmlFor="access" className="sm:col-span-2">
              <select id="access" name="access" defaultValue={v.access ?? 'user'} className={cn(INPUT_CLASS, 'h-10')}>
                <option value="user">წევრი</option>
                <option value="admin">ადმინი</option>
              </select>
            </Field>
          ) : null}
        </div>

        {state.error ? <FormError>{state.error}</FormError> : null}

        <Submit label="ანგარიშის შექმნა" icon={<UserPlus />} />
      </form>

      <SecretDialog
        secret={revealed}
        title="ანგარიშის პაროლი"
        description={<>გადაეცი @{state.username}-ს პირადად. პირველი შესვლისას ინტერესებს აირჩევს, შემდეგ პაროლს პარამეტრებში შეცვლის.</>}
        onClose={() => setRevealed(null)}
      />
    </>
  );
}
