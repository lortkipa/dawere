'use client';

import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { completeOnboardingAction } from '@/app/actions/onboarding';
import { FormError } from '@/components/ui';
import { DISCOVERY_OPTIONS, ROLE_OPTIONS } from '@/lib/onboarding-options';
import { cn } from '@/lib/utils';

type Topic = { id: string; slug: string; name: string };

const MINIMUM_TOPICS = 3;
const STEPS = 3;

/* ------------------------------------------------------------------ chrome */

/** Three short bars; the current one is drawn longer. */
function Progress({ step }: { step: number }) {
  return (
    <div className="mb-8 flex items-center gap-1.5">
      <span className="sr-only">
        ნაბიჯი {step} / {STEPS}
      </span>
      {Array.from({ length: STEPS }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={cn(
            'h-1 rounded-full transition-[width,background-color] duration-500 ease-out',
            index === step - 1 ? 'w-10' : 'w-5',
            index < step ? 'bg-ink' : 'bg-line-strong',
          )}
        />
      ))}
    </div>
  );
}

function StepHeading({ title, note, focus }: { title: string; note?: string; focus: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null);
  // Each step replaces the last in place; moving focus to its heading tells
  // screen readers that the page changed under them. Not on first load.
  useEffect(() => {
    if (focus) ref.current?.focus({ preventScroll: true });
  }, [focus]);

  return (
    <div className="mb-8">
      <h1 ref={ref} tabIndex={-1} className="headline text-[2.25rem] text-ink outline-none sm:text-[2.6rem]">
        {title}
      </h1>
      {note ? <p className="mt-3 text-[15px] leading-relaxed text-muted">{note}</p> : null}
    </div>
  );
}

const PRIMARY =
  'inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-semibold ' +
  'text-primary-contrast transition-[background-color,opacity,transform] duration-150 hover:bg-primary-hover ' +
  'active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45';

const QUIET_LINK = 'text-[15px] font-medium text-muted transition-colors hover:text-ink disabled:opacity-50';

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="უკან"
      className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-raised text-muted shadow-soft transition-colors hover:bg-hover hover:text-ink"
    >
      <ArrowLeft className="size-[18px]" />
    </button>
  );
}

function Actions({ onBack, children, below }: { onBack?: () => void; children: ReactNode; below?: ReactNode }) {
  return (
    <div className="mt-10">
      <div className="flex gap-2.5">
        {onBack ? <BackButton onClick={onBack} /> : null}
        {children}
      </div>
      {below ? <div className="mt-6 text-center">{below}</div> : null}
    </div>
  );
}

function FinishButton() {
  const { pending, data } = useFormStatus();
  const skipping = data?.get('skip') === 'role';
  return (
    <button type="submit" disabled={pending} className={PRIMARY}>
      {pending && !skipping ? <Loader2 className="size-[18px] animate-spin" /> : null}
      დასრულება
    </button>
  );
}

/** A skip on the last step is a submit of its own; see the server action. */
function SkipSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="skip" value="role" disabled={pending} className={QUIET_LINK}>
      გამოტოვება
    </button>
  );
}

/* ----------------------------------------------------------------- choices */

/**
 * Topics and sources are short labels, so they wrap as pills: the whole set
 * fits on one screen. Selecting fills the pill without changing its width,
 * so nothing reflows under the pointer.
 */
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-11 items-center rounded-full border px-[1.15rem] text-[15px] font-medium',
        'transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.97]',
        active
          ? 'border-primary bg-primary text-primary-contrast'
          : 'border-transparent bg-sunken text-ink hover:border-line-strong hover:bg-raised',
      )}
    >
      {children}
    </button>
  );
}

/** The role question has a line of explanation per answer, so it gets rows. */
function RoleRow({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left sm:px-6 sm:py-5',
        'transition-[background-color,border-color,box-shadow] duration-300',
        active ? 'border-line-strong bg-raised shadow-lift' : 'border-transparent bg-sunken hover:border-line',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[16.5px] leading-snug font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-[14px] leading-relaxed text-muted">{hint}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-200',
          active ? 'border-primary bg-primary' : 'border-line-strong bg-surface',
        )}
      >
        <span
          className={cn(
            'size-2 rounded-full bg-primary-contrast transition-transform duration-200',
            active ? 'scale-100' : 'scale-0',
          )}
        />
      </span>
    </button>
  );
}

/* --------------------------------------------------------------------- flow */

export function OnboardingFlow({ topics, firstName }: { topics: Topic[]; firstName: string }) {
  const [state, formAction] = useActionState(completeOnboardingAction, { ok: false });

  const [step, setStep] = useState(1);
  const [moved, setMoved] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [role, setRole] = useState('');

  const missing = MINIMUM_TOPICS - selected.size;

  function go(to: number) {
    setMoved(true);
    setStep(to);
  }

  function toggleTopic(slug: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  // `data-step` also lets the landscape beside the form follow along.
  return (
    <form action={formAction} data-step={step}>
      {/* Everything answered so far travels with the single final submit. */}
      {[...selected].map((slug) => (
        <input key={slug} type="hidden" name="topic" value={slug} />
      ))}
      <input type="hidden" name="discoverySource" value={source} />
      <input type="hidden" name="discoveryNote" value={source === 'other' ? note : ''} />
      <input type="hidden" name="role" value={role} />

      <Progress step={step} />

      {state.error ? (
        <div className="mb-6">
          <FormError>{state.error}</FormError>
        </div>
      ) : null}

      {/* ------------------------------------------------- 1 · interests */}
      {step === 1 ? (
        <section key="topics" className="animate-rise">
          <StepHeading focus={moved} title={`რა გაინტერესებს, ${firstName}?`} note={`აირჩიე მინიმუმ ${MINIMUM_TOPICS} თემა.`} />

          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Pill key={topic.id} active={selected.has(topic.slug)} onClick={() => toggleTopic(topic.slug)}>
                {topic.name}
              </Pill>
            ))}
          </div>

          <Actions>
            <button type="button" className={PRIMARY} disabled={missing > 0} onClick={() => go(2)}>
              {missing > 0 ? `აირჩიე კიდევ ${missing}` : 'გაგრძელება'}
            </button>
          </Actions>
        </section>
      ) : null}

      {/* ----------------------------------------------- 2 · how they came */}
      {step === 2 ? (
        <section key="source" className="animate-rise">
          <StepHeading focus={moved} title="საიდან გაიგე Dawere-ს შესახებ?" />

          <div className="flex flex-wrap gap-2">
            {DISCOVERY_OPTIONS.map((option) => (
              <Pill
                key={option.key}
                active={source === option.key}
                onClick={() => setSource(source === option.key ? '' : option.key)}
              >
                {option.label}
              </Pill>
            ))}
          </div>

          {source === 'other' ? (
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={(event) => {
                // Enter here means "next", not "submit half an answer".
                if (event.key === 'Enter') {
                  event.preventDefault();
                  go(3);
                }
              }}
              maxLength={120}
              autoFocus
              placeholder="მოგვიყევი, საიდან"
              aria-label="საიდან გაიგე Dawere-ს შესახებ"
              className={cn(
                'animate-pop-in mt-4 h-12 w-full rounded-xl border border-line-strong bg-raised px-3.5 text-[15px] text-ink shadow-soft',
                'transition-[border-color,box-shadow] placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none',
              )}
            />
          ) : null}

          <Actions
            onBack={() => go(1)}
            below={
              <button
                type="button"
                className={QUIET_LINK}
                onClick={() => {
                  setSource('');
                  setNote('');
                  go(3);
                }}
              >
                გამოტოვება
              </button>
            }
          >
            <button type="button" className={PRIMARY} disabled={!source} onClick={() => go(3)}>
              გაგრძელება
            </button>
          </Actions>
        </section>
      ) : null}

      {/* ---------------------------------------------------- 3 · who they are */}
      {step === 3 ? (
        <section key="role" className="animate-rise">
          <StepHeading focus={moved} title="მკითხველი ხარ თუ ავტორი?" />

          <div className="space-y-2.5">
            {ROLE_OPTIONS.map((option) => (
              <RoleRow
                key={option.key}
                active={role === option.key}
                onClick={() => setRole(role === option.key ? '' : option.key)}
                label={option.label}
                hint={option.hint}
              />
            ))}
          </div>

          <Actions onBack={() => go(2)} below={<SkipSubmit />}>
            <FinishButton />
          </Actions>
        </section>
      ) : null}
    </form>
  );
}
