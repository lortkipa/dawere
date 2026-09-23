'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button, Field, FormError, Input } from '@/components/ui';
import type { FormState } from '@/lib/validation';

const EMPTY: FormState = { ok: false };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {label}
    </Button>
  );
}

function PasswordInput({
  name,
  autoComplete,
  error,
}: {
  name: string;
  autoComplete: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={name}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        className="pr-11"
        aria-invalid={Boolean(error)}
        required
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-ink"
        aria-label={visible ? 'პაროლის დამალვა' : 'პაროლის ჩვენება'}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function AuthForm({
  mode,
  action,
  next,
  forgotHref,
}: {
  mode: 'signin' | 'signup';
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  /** Where to go after signing in; validated again on the server. */
  next?: string;
  /** Sign-in only: a way to ask for help with a forgotten password. */
  forgotHref?: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY);
  const fieldErrors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const isSignUp = mode === 'signup';

  // A form action resets the form when it returns; defaultValue from the echoed
  // values is what survives that reset, so a typo does not cost the whole form.
  return (
    <form action={formAction} className="space-y-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormError>{state.error}</FormError>

      {isSignUp ? (
        <Field label="სახელი" htmlFor="name" error={fieldErrors.name}>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            defaultValue={values.name}
            placeholder="ნინო აბაშიძე"
            aria-invalid={Boolean(fieldErrors.name)}
            required
          />
        </Field>
      ) : null}

      <Field label="ელფოსტა" htmlFor="email" error={fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          defaultValue={values.email}
          placeholder="name@example.com"
          aria-invalid={Boolean(fieldErrors.email)}
          required
        />
      </Field>

      <Field
        label="პაროლი"
        htmlFor="password"
        error={fieldErrors.password}
        hint={
          isSignUp ? (
            'მინიმუმ 8 სიმბოლო'
          ) : forgotHref ? (
            <a href={forgotHref} className="font-medium text-accent hover:underline">
              დაგავიწყდა?
            </a>
          ) : undefined
        }
      >
        <PasswordInput
          name="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          error={fieldErrors.password}
        />
      </Field>

      <SubmitButton label={isSignUp ? 'ანგარიშის შექმნა' : 'შესვლა'} />
    </form>
  );
}
