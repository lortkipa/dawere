'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { completeOnboardingAction } from '@/app/actions/onboarding';
import { Button, FormError, Input } from '@/components/ui';
import { DISCOVERY_OPTIONS, ROLE_OPTIONS } from '@/lib/onboarding-options';
import { topicEmoji } from '@/lib/topic-art';
import { cn } from '@/lib/utils';

type Topic = { id: string; slug: string; name: string; description: string };

const MINIMUM_TOPICS = 3;

/* ------------------------------------------------------------------ chrome */

function Stepper({ step, total }: { step: number; total: number }) {
  return (
    <div aria-hidden>
      <p className="text-[13px] font-medium text-subtle tabular-nums">
        ნაბიჯი {step} / {total}
      </p>
      <div className="mt-2.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }).map((_, index) => (
          <span
            key={index}
            className={cn('h-1 rounded-full transition-colors duration-300', index < step ? 'bg-ink' : 'bg-line')}
          />
        ))}
      </div>
    </div>
  );
}

function StepHeader({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl leading-tight font-semibold tracking-tight text-ink sm:text-[1.75rem]">{title}</h1>
      {note ? <p className="mt-2 text-[15px] text-muted">{note}</p> : null}
    </div>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {children}
    </Button>
  );
}

function SkipButton({ children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="button" size="lg" variant="ghost" disabled={pending} {...props}>
      {children}
    </Button>
  );
}

/* -------------------------------------------------------------------- cards */

function OptionCard({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-3 rounded-xl border p-4 text-left transition-colors',
        active
          ? 'border-accent bg-accent-soft ring-1 ring-accent'
          : 'border-line bg-raised hover:border-line-strong hover:bg-hover',
      )}
    >
      <span className="text-xl leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium text-ink">{label}</span>
      {active ? (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast">
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}

/**
 * Topics are the long list, so they wrap as pills rather than stacking as
 * cards: the whole editorial set fits on one screen, and no count of topics
 * leaves a lonely card on the last row.
 */
function TopicPill({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[15px] font-medium transition-colors',
        active
          ? 'border-accent bg-accent-soft text-accent ring-1 ring-accent'
          : 'border-line bg-raised text-ink hover:border-line-strong hover:bg-hover',
      )}
    >
      {active ? (
        <span className="flex size-[18px] items-center justify-center rounded-full bg-accent text-accent-contrast">
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : (
        <span className="text-lg leading-none" aria-hidden>
          {emoji}
        </span>
      )}
      {label}
    </button>
  );
}

/** The three role choices get a taller card: emoji, label, one line of hint. */
function RoleCard({
  active,
  onClick,
  emoji,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'relative flex h-full flex-col items-start rounded-xl border p-5 text-left transition-colors',
        active
          ? 'border-accent bg-accent-soft ring-1 ring-accent'
          : 'border-line bg-raised hover:border-line-strong hover:bg-hover',
      )}
    >
      {active ? (
        <span className="absolute top-4 right-4 flex size-5 items-center justify-center rounded-full bg-accent text-accent-contrast">
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : null}
      <span className="text-2xl leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="mt-4 text-[15px] font-semibold text-ink">{label}</span>
      <span className="mt-1 text-[13px] leading-relaxed text-muted">{hint}</span>
    </button>
  );
}

/* --------------------------------------------------------------------- flow */

export function OnboardingFlow({ topics, firstName }: { topics: Topic[]; firstName: string }) {
  const [state, formAction] = useActionState(completeOnboardingAction, { ok: false });

  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [role, setRole] = useState('');

  const enough = selected.size >= MINIMUM_TOPICS;

  function toggleTopic(slug: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <form action={formAction}>
      {/* Everything answered so far travels with the single final submit. */}
      {[...selected].map((slug) => (
        <input key={slug} type="hidden" name="topic" value={slug} />
      ))}
      <input type="hidden" name="discoverySource" value={source} />
      <input type="hidden" name="discoveryNote" value={source === 'other' ? note : ''} />
      <input type="hidden" name="role" value={role} />

      <div className="mb-10">
        <Stepper step={step} total={3} />
      </div>

      <FormError>{state.error}</FormError>

      {/* ------------------------------------------------- 1 · interests */}
      {step === 1 ? (
        <section>
          <StepHeader
            title={`გამარჯობა, ${firstName}. რა გაინტერესებს?`}
            note={`აირჩიე მინიმუმ ${MINIMUM_TOPICS} თემა.`}
          />

          <div className="flex flex-wrap gap-2.5">
            {topics.map((topic) => (
              <TopicPill
                key={topic.id}
                active={selected.has(topic.slug)}
                onClick={() => toggleTopic(topic.slug)}
                emoji={topicEmoji(topic.slug)}
                label={topic.name}
              />
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <span className="text-[13px] text-subtle">
              {enough ? `არჩეულია ${selected.size}` : `აირჩიე კიდევ ${MINIMUM_TOPICS - selected.size}`}
            </span>
            <Button type="button" size="lg" disabled={!enough} onClick={() => setStep(2)}>
              გაგრძელება
              <ArrowRight />
            </Button>
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------- 2 · how they came */}
      {step === 2 ? (
        <section>
          <StepHeader title="საიდან შეგვნიშნე?" note="ერთი პასუხი დაგვეხმარება." />

          <div className="grid gap-3 sm:grid-cols-2">
            {DISCOVERY_OPTIONS.map((option) => (
              <OptionCard
                key={option.key}
                active={source === option.key}
                onClick={() => setSource(source === option.key ? '' : option.key)}
                emoji={option.emoji}
                label={option.label}
              />
            ))}
          </div>

          {source === 'other' ? (
            <div className="mt-4">
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                onKeyDown={(event) => {
                  // Enter here means "next", not "submit half an answer".
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    setStep(3);
                  }
                }}
                maxLength={120}
                autoFocus
                placeholder="მოგვიყევი, საიდან…"
                aria-label="საიდან შეგვნიშნე"
              />
            </div>
          ) : null}

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <Button type="button" size="lg" variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft />
              უკან
            </Button>
            <div className="flex items-center gap-2">
              <SkipButton
                onClick={() => {
                  setSource('');
                  setNote('');
                  setStep(3);
                }}
              >
                გამოტოვება
              </SkipButton>
              <Button type="button" size="lg" disabled={!source} onClick={() => setStep(3)}>
                გაგრძელება
                <ArrowRight />
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------- 3 · who they are */}
      {step === 3 ? (
        <section>
          <StepHeader title="მკითხველი ხარ თუ ავტორი?" note="ორივეს არჩევაც შეიძლება." />

          <div className="grid gap-3 sm:grid-cols-3">
            {ROLE_OPTIONS.map((option) => (
              <RoleCard
                key={option.key}
                active={role === option.key}
                onClick={() => setRole(role === option.key ? '' : option.key)}
                emoji={option.emoji}
                label={option.label}
                hint={option.hint}
              />
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <Button type="button" size="lg" variant="ghost" onClick={() => setStep(2)}>
              <ArrowLeft />
              უკან
            </Button>
            <div className="flex items-center gap-2">
              {/* A skip is a real submit: the answer is simply left empty. */}
              <Button type="submit" size="lg" variant="ghost" name="skip" value="role">
                გამოტოვება
              </Button>
              <SubmitButton>დასრულება</SubmitButton>
            </div>
          </div>
        </section>
      ) : null}
    </form>
  );
}
