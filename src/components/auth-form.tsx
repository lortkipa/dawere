'use client';

import { useActionState, useRef, useState, ViewTransition, type ComponentProps, type ReactNode } from 'react';
import { Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { FormError } from '@/components/ui';
import { cn, editDistance } from '@/lib/utils';
import type { FormState } from '@/lib/validation';

const EMPTY: FormState = { ok: false };
const MIN_PASSWORD = 8;

/** Every answer from the server is a new object; numbering them replays the error shake. */
const attempts = new WeakMap<FormState, number>();
let attemptCount = 0;
function attemptOf(state: FormState) {
  if (!attempts.has(state)) attempts.set(state, ++attemptCount);
  return attempts.get(state)!;
}

const COMMON_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'live.com', 'mail.ru'];

/** "nino@gmial.com" → "nino@gmail.com"; null when the domain looks deliberate. */
function suggestEmail(value: string): string | null {
  const at = value.lastIndexOf('@');
  if (at < 1) return null;
  const domain = value.slice(at + 1).trim().toLowerCase();
  if (domain.length < 4 || COMMON_DOMAINS.includes(domain)) return null;
  let best: string | null = null;
  let bestDistance = 3;
  for (const candidate of COMMON_DOMAINS) {
    const d = editDistance(domain, candidate);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best ? `${value.slice(0, at + 1)}${best}` : null;
}

const INPUT =
  'h-12 w-full rounded-xl border border-line-strong bg-raised px-3.5 text-[15px] text-ink shadow-soft ' +
  'transition-[border-color,box-shadow] placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 ' +
  'focus:outline-none aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15';

/** Shared fields glide between the two forms when switching; see globals.css. */
function Morph({ name, children }: { name: string; children: ReactNode }) {
  return (
    <ViewTransition name={name} share="auth-morph" default="none">
      {children}
    </ViewTransition>
  );
}

function AuthField({
  id,
  label,
  aside,
  error,
  children,
}: {
  id: string;
  label: string;
  aside?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function EmailInput({ defaultValue, error }: { defaultValue?: string; error?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  return (
    <AuthField id="email" label="ელფოსტა" error={error}>
      <input
        ref={ref}
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        defaultValue={defaultValue}
        placeholder="name@example.com"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'email-error' : undefined}
        onBlur={(event) => setSuggestion(suggestEmail(event.target.value))}
        onInput={() => setSuggestion(null)}
        className={INPUT}
        required
      />
      {suggestion ? (
        <p className="animate-pop-in mt-2 text-[13px] text-muted">
          იქნებ იგულისხმე{' '}
          <button
            type="button"
            onClick={() => {
              if (ref.current) ref.current.value = suggestion;
              setSuggestion(null);
            }}
            className="font-medium text-accent hover:underline"
          >
            {suggestion}
          </button>
          ?
        </p>
      ) : null}
    </AuthField>
  );
}

function PasswordInput({ isSignUp, error, aside }: { isSignUp: boolean; error?: string; aside?: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [length, setLength] = useState(0);
  const [capsLock, setCapsLock] = useState(false);
  const long = length >= MIN_PASSWORD;

  const onKey: ComponentProps<'input'>['onKeyDown'] = (event) => {
    setCapsLock(event.getModifierState?.('CapsLock') ?? false);
  };

  return (
    <AuthField
      id="password"
      label="პაროლი"
      error={error}
      aside={
        isSignUp ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[13px] transition-colors',
              long ? 'text-accent' : 'text-subtle',
            )}
          >
            {long ? <Check className="size-3.5" aria-hidden /> : null}
            მინიმუმ {MIN_PASSWORD} სიმბოლო
          </span>
        ) : (
          aside
        )
      }
    >
      <div className="relative">
        <input
          id="password"
          name="password"
          type={visible ? 'text' : 'password'}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'password-error' : undefined}
          onChange={(event) => setLength(event.target.value.length)}
          onKeyDown={onKey}
          onKeyUp={onKey}
          onBlur={() => setCapsLock(false)}
          className={cn(INPUT, 'pr-12')}
          required
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-hover hover:text-ink"
          aria-label={visible ? 'პაროლის დამალვა' : 'პაროლის ჩვენება'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>

      {isSignUp ? (
        // Fills letter by letter up to the minimum length.
        <div className="mt-2.5 grid grid-cols-8 gap-1" aria-hidden>
          {Array.from({ length: MIN_PASSWORD }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-1 rounded-full transition-colors duration-200',
                i < length ? 'bg-accent' : 'bg-line',
              )}
            />
          ))}
        </div>
      ) : null}

      {capsLock ? (
        <p className="animate-pop-in mt-2 text-[13px] text-warning-text">Caps Lock ჩართულია.</p>
      ) : null}
    </AuthField>
  );
}

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-contrast transition-[background-color,transform] duration-150 hover:bg-primary-hover active:scale-[0.985] disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-[18px] animate-spin" /> : null}
      {label}
    </button>
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
  const [state, formAction, pending] = useActionState(action, EMPTY);
  const fieldErrors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const isSignUp = mode === 'signup';

  // A form action resets the form when it returns; defaultValue from the echoed
  // values is what survives that reset, so a typo does not cost the whole form.
  return (
    <form action={formAction} className="space-y-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.error ? (
        <div key={attemptOf(state)} className="animate-shake">
          <FormError>{state.error}</FormError>
        </div>
      ) : null}

      {isSignUp ? (
        <ViewTransition enter="auth-enter" exit="auth-exit" default="none">
          <AuthField id="name" label="სახელი" error={fieldErrors.name}>
            <input
              id="name"
              name="name"
              autoComplete="name"
              defaultValue={values.name}
              placeholder="ნინო აბაშიძე"
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'name-error' : undefined}
              className={INPUT}
              required
            />
          </AuthField>
        </ViewTransition>
      ) : null}

      <Morph name="auth-email">
        <div>
          <EmailInput defaultValue={values.email} error={fieldErrors.email} />
        </div>
      </Morph>

      <Morph name="auth-password">
        <div>
          {/* The form reset empties the field after every answer; remounting
              clears the length meter and the visibility toggle with it. */}
          <PasswordInput
            key={attemptOf(state)}
            isSignUp={isSignUp}
            error={fieldErrors.password}
            aside={
              forgotHref ? (
                <a href={forgotHref} className="text-[13px] font-medium text-muted hover:text-ink">
                  დაგავიწყდა?
                </a>
              ) : undefined
            }
          />
        </div>
      </Morph>

      <Morph name="auth-submit">
        <div className="pt-1">
          <SubmitButton label={isSignUp ? 'ანგარიშის შექმნა' : 'შესვლა'} pending={pending} />
        </div>
      </Morph>
    </form>
  );
}
