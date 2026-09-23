import { cn } from '@/lib/utils';

/** A row of text, drawn. Widths vary so the block reads as prose, not a table. */
function Lines({ widths }: { widths: string[] }) {
  return (
    <div className="space-y-2.5">
      {widths.map((width, index) => (
        <div key={index} className="h-2 rounded-full bg-line-strong/70" style={{ width }} />
      ))}
    </div>
  );
}

/**
 * The panel beside the sign-in form: a draft being written, a comment arriving
 * on it, and the topics it was filed under. Purely decorative — no text to read,
 * so it never competes with the form.
 */
export function AuthArt({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-sunken', className)} aria-hidden>
      <div className="dot-grid absolute inset-0 opacity-50" />
      <div className="absolute -top-24 -right-16 size-[28rem] rounded-full bg-accent-soft blur-3xl" />
      <div className="absolute -bottom-32 -left-20 size-[26rem] rounded-full bg-accent-soft opacity-60 blur-3xl" />

      <div className="relative flex h-full flex-col items-center justify-center gap-24 p-10">
        <div className="relative w-[22rem]">
          {/* the draft */}
          <div className="rotate-[-4deg] rounded-2xl border border-line bg-raised p-6 shadow-2xl shadow-black/10 dark:shadow-black/40">
            <div className="flex items-center gap-2.5">
              <span className="size-8 rounded-full bg-accent/85" />
              <div className="space-y-1.5">
                <div className="h-2 w-24 rounded-full bg-line-strong/70" />
                <div className="h-1.5 w-14 rounded-full bg-line-strong/40" />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="h-4 w-4/5 rounded-full bg-ink/85" />
              <div className="h-4 w-3/5 rounded-full bg-ink/85" />
            </div>

            <div className="mt-6">
              <Lines widths={['100%', '92%', '97%', '64%']} />
            </div>

            <div className="mt-6 h-24 rounded-xl border border-line bg-sunken" />

            <div className="mt-6">
              <Lines widths={['88%', '96%', '45%']} />
            </div>
          </div>

          {/* a comment landing on it */}
          <div className="absolute -right-12 -bottom-10 w-56 rotate-[5deg] rounded-2xl border border-line bg-raised p-4 shadow-xl shadow-black/10 dark:shadow-black/40">
            <div className="flex items-start gap-2.5">
              <span className="size-7 shrink-0 rounded-full bg-accent/35" />
              <div className="mt-1 flex-1 space-y-2">
                <div className="h-1.5 w-full rounded-full bg-line-strong/70" />
                <div className="h-1.5 w-3/4 rounded-full bg-line-strong/70" />
              </div>
            </div>
          </div>

          {/* the topics it is filed under */}
          <div className="absolute -top-8 -left-14 flex rotate-[-8deg] gap-2">
            {['✍️', '📖', '💡'].map((emoji) => (
              <span
                key={emoji}
                className="flex size-11 items-center justify-center rounded-2xl border border-line bg-raised text-lg shadow-lg shadow-black/5 dark:shadow-black/30"
              >
                {emoji}
              </span>
            ))}
          </div>
        </div>

        <p className="max-w-sm text-center font-serif text-xl leading-snug font-semibold text-ink/80">
          ტექსტები ტექნოლოგიაზე, დიზაინზე, საკვებზე და ყველაფერზე, რაც გაინტერესებს.
        </p>
      </div>
    </div>
  );
}
