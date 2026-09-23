'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { AlertTriangle, Check, ImagePlus, Loader2, LogOut, Plus, Trash2 } from 'lucide-react';
import {
  changePasswordAction,
  deleteAccountAction,
  removeAvatarAction,
  signOutOthersAction,
  updateAvatarAction,
  updateInterestsAction,
  updateProfileAction,
} from '@/app/actions/profile';
import { Avatar, Button, Card, Field, FormError, Input, Textarea } from '@/components/ui';
import { toast } from '@/components/toaster';
import type { FormState } from '@/lib/validation';
import { cn } from '@/lib/utils';

const EMPTY: FormState = { ok: false };

function SaveButton({
  label = 'ცვლილებების შენახვა',
  disabled,
  variant,
}: {
  label?: string;
  disabled?: boolean;
  variant?: 'primary' | 'danger';
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending || disabled}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {label}
    </Button>
  );
}

function Saved({ state, text = 'შენახულია' }: { state: FormState; text?: string }) {
  if (!state.ok) return null;
  return (
    <p role="status" className="inline-flex items-center gap-1.5 text-sm text-accent">
      <Check className="size-4" />
      {text}
    </p>
  );
}

function SectionCard({
  title,
  description,
  children,
  id,
  tone,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  id?: string;
  tone?: 'danger';
}) {
  return (
    <Card id={id} className={cn('scroll-mt-24 p-6 sm:p-7', tone === 'danger' && 'border-danger/30')}>
      <h2 className={cn('text-base font-semibold', tone === 'danger' && 'text-danger')}>{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-6">{children}</div>
    </Card>
  );
}

export function AvatarForm({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [state, formAction, uploading] = useActionState(updateAvatarAction, EMPTY);
  const [removing, startRemove] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <SectionCard title="პროფილის სურათი" description="PNG, JPEG, WebP, GIF ან AVIF, 5 მბ-მდე.">
      <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-5">
        <div className="relative">
          <Avatar name={name} src={avatarUrl} size="xl" />
          {uploading || removing ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white">
              <Loader2 className="size-5 animate-spin" />
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label
            className={cn(
              'inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-raised px-4.5 text-sm font-medium text-ink transition-colors hover:bg-hover',
              'focus-within:ring-2 focus-within:ring-accent',
              uploading && 'pointer-events-none opacity-60',
            )}
          >
            <ImagePlus className="size-4" />
            {avatarUrl ? 'შეცვლა' : 'ატვირთვა'}
            <input
              type="file"
              name="avatar"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              className="sr-only"
              onChange={(event) => {
                // Submit as soon as a file is chosen: a separate "upload" click
                // after picking a file is a step nobody wants.
                if (event.target.files?.length) formRef.current?.requestSubmit();
              }}
            />
          </label>

          {avatarUrl ? (
            <Button
              type="button"
              variant="ghost"
              disabled={removing || uploading}
              onClick={() =>
                startRemove(async () => {
                  await removeAvatarAction();
                  toast('სურათი წაიშალა');
                })
              }
            >
              წაშლა
            </Button>
          ) : null}
        </div>
      </form>

      {state.error ? (
        <div className="mt-4">
          <FormError>{state.error}</FormError>
        </div>
      ) : null}
    </SectionCard>
  );
}

export function ProfileForm({
  initial,
}: {
  initial: { name: string; username: string; bio: string; location: string; website: string };
}) {
  const [state, formAction] = useActionState(updateProfileAction, EMPTY);
  const errors = state.fieldErrors ?? {};
  // After a submit, show what was sent (valid or not) rather than snapping back.
  const v = { ...initial, ...state.values };
  const [bioLength, setBioLength] = useState(v.bio.length);

  return (
    <SectionCard title="პროფილი" description="ასე გხედავენ მკითხველები.">
      <form action={formAction} className="space-y-5">
        <FormError>{state.error && !state.fieldErrors ? state.error : undefined}</FormError>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="სახელი" htmlFor="name" error={errors.name}>
            <Input id="name" name="name" defaultValue={v.name} maxLength={60} required aria-invalid={Boolean(errors.name)} />
          </Field>

          <Field label="მომხმარებლის სახელი" htmlFor="username" error={errors.username}>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] text-subtle">
                @
              </span>
              <Input
                id="username"
                name="username"
                defaultValue={v.username}
                maxLength={30}
                pattern="[A-Za-z0-9_]+"
                required
                className="pl-8"
                aria-invalid={Boolean(errors.username)}
              />
            </div>
          </Field>
        </div>

        <Field label="ბიოგრაფია" htmlFor="bio" error={errors.bio} hint={`${bioLength}/280`}>
          <Textarea
            id="bio"
            name="bio"
            defaultValue={v.bio}
            rows={3}
            maxLength={280}
            onChange={(event) => setBioLength(event.target.value.length)}
            placeholder="რამდენიმე სიტყვა შენზე"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="მდებარეობა" htmlFor="location" error={errors.location}>
            <Input id="location" name="location" defaultValue={v.location} maxLength={80} placeholder="თბილისი" />
          </Field>
          <Field label="ვებგვერდი" htmlFor="website" error={errors.website}>
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={v.website}
              placeholder="https://"
              maxLength={200}
              aria-invalid={Boolean(errors.website)}
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <SaveButton />
          <Saved state={state} />
        </div>
      </form>
    </SectionCard>
  );
}

type TopicOption = { slug: string; name: string };

const sortedKey = (list: TopicOption[]) =>
  list
    .map((t) => t.slug)
    .sort()
    .join(' ');

/**
 * Current interests come first, switched on; featured topics follow as things
 * to add. Chips toggle in place rather than moving between groups, so nothing
 * jumps under the pointer mid-edit.
 */
export function InterestsForm({
  interests,
  suggestions,
}: {
  interests: TopicOption[];
  suggestions: TopicOption[];
}) {
  const [state, formAction] = useActionState(updateInterestsAction, EMPTY);
  const [selected, setSelected] = useState(() => new Set(interests.map((t) => t.slug)));

  // After a save the server's list is the truth again; pick it up without
  // remounting, which would also wipe the "saved" note.
  const serverKey = sortedKey(interests);
  const [syncedKey, setSyncedKey] = useState(serverKey);
  if (syncedKey !== serverKey) {
    setSyncedKey(serverKey);
    setSelected(new Set(interests.map((t) => t.slug)));
  }

  const saved = new Set(interests.map((t) => t.slug));
  const pool = [...interests, ...suggestions.filter((t) => !saved.has(t.slug))];
  const add = [...selected].filter((slug) => !saved.has(slug));
  const remove = [...saved].filter((slug) => !selected.has(slug));
  const dirty = add.length + remove.length > 0;

  function toggle(slug: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <SectionCard
      id="interests"
      title="შენი ინტერესები"
      description="„შენთვის“ ნაკადი ამ თემებიდან იწყება და იმით ზუსტდება, რასაც კითხულობ."
    >
      <form action={formAction}>
        {add.map((slug) => (
          <input key={`add-${slug}`} type="hidden" name="add" value={slug} />
        ))}
        {remove.map((slug) => (
          <input key={`remove-${slug}`} type="hidden" name="remove" value={slug} />
        ))}

        {pool.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {pool.map((topic) => {
              const on = selected.has(topic.slug);
              return (
                <button
                  key={topic.slug}
                  type="button"
                  onClick={() => toggle(topic.slug)}
                  aria-pressed={on}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border py-1.5 pr-3.5 pl-3 text-sm font-medium transition-colors [&>svg]:size-3.5',
                    on
                      ? 'border-accent/30 bg-accent-soft text-accent hover:border-accent/60'
                      : 'border-line bg-sunken text-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  {on ? <Check strokeWidth={3} /> : <Plus strokeWidth={2.5} />}
                  {topic.name}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">თემები ჯერ არ არის.</p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <SaveButton disabled={!dirty} />
          {dirty ? (
            <span className="text-[13px] text-subtle">შენახვა არ დაგავიწყდეს</span>
          ) : (
            <Saved state={state} />
          )}
        </div>
      </form>
    </SectionCard>
  );
}

export function PasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, EMPTY);
  const errors = state.fieldErrors ?? {};

  return (
    <SectionCard title="პაროლი" description="შეცვლის შემდეგ სხვა მოწყობილობებზე სესიები დაიხურება.">
      <form action={formAction} className="space-y-5">
        <FormError>{state.error && !state.fieldErrors ? state.error : undefined}</FormError>

        <Field label="მიმდინარე პაროლი" htmlFor="currentPassword" error={errors.currentPassword}>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(errors.currentPassword)}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="ახალი პაროლი" htmlFor="newPassword" error={errors.newPassword} hint="8+ სიმბოლო">
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(errors.newPassword)}
            />
          </Field>
          <Field label="გაიმეორე ახალი პაროლი" htmlFor="confirmPassword" error={errors.confirmPassword}>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(errors.confirmPassword)}
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <SaveButton label="პაროლის შეცვლა" />
          <Saved state={state} text="პაროლი შეიცვალა" />
        </div>
      </form>
    </SectionCard>
  );
}

export function SessionsCard({ otherSessions }: { otherSessions: number }) {
  const [state, formAction] = useActionState(signOutOthersAction, EMPTY);

  return (
    <SectionCard
      title="სესიები"
      description={
        otherSessions === 0
          ? 'ამჟამად მხოლოდ ამ მოწყობილობაზე ხარ შესული.'
          : `შესული ხარ კიდევ ${otherSessions} სხვა მოწყობილობაზე ან ბრაუზერში.`
      }
    >
      <form action={formAction} className="flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={otherSessions === 0}>
          <LogOut />
          სხვაგან გასვლა
        </Button>
        <Saved state={state} text="სხვა სესიები დაიხურა" />
      </form>
    </SectionCard>
  );
}

export function DeleteAccountForm() {
  const [state, formAction] = useActionState(deleteAccountAction, EMPTY);
  const [open, setOpen] = useState(false);
  const errors = state.fieldErrors ?? {};

  return (
    <SectionCard
      title="ანგარიშის წაშლა"
      description="წაიშლება პროფილი, ყველა სტატია, კომენტარი და სტატისტიკა. ამის დაბრუნება შეუძლებელია."
      tone="danger"
    >
      {open ? (
        <form action={formAction} className="space-y-5">
          <FormError>{state.error && !state.fieldErrors ? state.error : undefined}</FormError>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="პაროლი" htmlFor="delete-password" error={errors.password}>
              <Input
                id="delete-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                aria-invalid={Boolean(errors.password)}
              />
            </Field>
            <Field label="ჩაწერე „წაშლა“" htmlFor="delete-confirm" error={errors.confirm}>
              <Input
                id="delete-confirm"
                name="confirm"
                defaultValue={state.values?.confirm}
                autoComplete="off"
                required
                aria-invalid={Boolean(errors.confirm)}
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SaveButton label="ანგარიშის სამუდამოდ წაშლა" variant="danger" />
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              გაუქმება
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="danger" onClick={() => setOpen(true)}>
          <Trash2 />
          ანგარიშის წაშლა…
        </Button>
      )}
      <p className="mt-4 flex items-start gap-2 text-[13px] text-subtle">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        თუ მხოლოდ დასვენება გინდა, უბრალოდ გამოდი ანგარიშიდან — ყველაფერი ადგილზე დაგხვდება.
      </p>
    </SectionCard>
  );
}
