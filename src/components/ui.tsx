import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn, avatarColor, initials } from '@/lib/utils';

/* -------------------------------------------------------------------- button */

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none ' +
  'transition-[background-color,color,border-color,box-shadow,opacity] ' +
  'disabled:pointer-events-none disabled:opacity-45 [&>svg]:shrink-0';

const BUTTON_VARIANTS = {
  primary: 'bg-primary text-primary-contrast hover:bg-primary-hover',
  accent: 'bg-accent text-accent-contrast hover:bg-accent-hover',
  outline: 'border border-line-strong bg-raised text-ink shadow-soft hover:bg-hover',
  soft: 'bg-sunken text-ink hover:bg-hover',
  ghost: 'text-muted hover:bg-hover hover:text-ink',
  danger: 'border border-danger/25 bg-danger-soft text-danger hover:border-danger hover:bg-danger hover:text-danger-contrast',
} as const;

const BUTTON_SIZES = {
  sm: 'h-8 px-3.5 text-[13px] [&>svg]:size-3.5',
  md: 'h-10 px-4.5 text-sm [&>svg]:size-4',
  lg: 'h-12 px-6 text-[15px] [&>svg]:size-[18px]',
  icon: 'size-10 [&>svg]:size-[18px]',
} as const;

type ButtonStyleProps = {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
};

export function buttonClass({ variant = 'primary', size = 'md' }: ButtonStyleProps = {}, extra?: string) {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], extra);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<'button'> & ButtonStyleProps) {
  return <button className={buttonClass({ variant, size }, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & ButtonStyleProps) {
  return <Link className={buttonClass({ variant, size }, className)} {...props} />;
}

/* --------------------------------------------------------------------- input */

export const INPUT_CLASS =
  'w-full rounded-xl border border-line-strong bg-raised px-3 py-2 text-[15px] text-ink shadow-soft placeholder:text-subtle ' +
  'transition-[border-color,box-shadow] focus:border-accent focus:outline-none ' +
  'focus:ring-4 focus:ring-accent/15 aria-[invalid=true]:border-danger disabled:opacity-60';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(INPUT_CLASS, 'h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(INPUT_CLASS, 'resize-y leading-relaxed', className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        {hint ? <span className="text-[12px] text-subtle">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------- avatar */

const AVATAR_SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-[12px]',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
  xl: 'size-20 text-2xl',
} as const;

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  const classes = cn(
    'shrink-0 overflow-hidden rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10',
    AVATAR_SIZES[size],
    className,
  );

  if (src) {
    // Avatars are user uploads served from our own route handler; next/image
    // would add a loader hop for no benefit at these sizes.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={classes} />;
  }

  return (
    <span
      className={cn(classes, 'flex items-center justify-center font-semibold text-white')}
      style={{ backgroundColor: avatarColor(name) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* ------------------------------------------------------------------ surfaces */

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-2xl border border-line bg-raised', className)} {...props} />;
}

const BADGE_TONES = {
  neutral: 'bg-sunken text-muted ring-line',
  accent: 'bg-accent-soft text-accent ring-accent/15',
  warning: 'bg-warning-soft text-warning-text ring-warning-border',
  danger: 'bg-danger-soft text-danger ring-danger/15',
} as const;

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: keyof typeof BADGE_TONES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap ring-1 ring-inset [&>svg]:size-3',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Loading placeholder. Purely visual: screen readers get the page's own status. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-md', className)} aria-hidden />;
}

/**
 * One page title, optionally with an action beside it. Pages use this instead of
 * a title plus an explanatory paragraph — the screen already explains itself.
 */
export function PageHeader({
  title,
  description,
  action,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}>
      <div className="min-w-0">
        <h1 className="headline text-[2.1rem] text-ink sm:text-[2.5rem]">{title}</h1>
        {description ? <p className="mt-2 text-[15.5px] leading-relaxed text-pretty text-muted">{description}</p> : null}
      </div>
      {action}
      {children}
    </header>
  );
}

/**
 * Nothing to show yet: one serif line, at most one sentence, maybe a way on.
 * No box around it — an empty list is a quiet moment, not an error.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('animate-rise px-4 py-14 text-center sm:py-20', className)}>
      <h2 className="headline wrap-anywhere text-[1.6rem] text-ink sm:text-[1.85rem]">{title}</h2>
      {description ? (
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-pretty text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-8 flex flex-wrap justify-center gap-2.5">{action}</div> : null}
    </div>
  );
}

/** A serif section title; `action` sits at the far end of the line. */
export function SectionHeading({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 flex items-baseline justify-between gap-4', className)}>
      <h2 className="headline text-[1.25rem] text-ink">{children}</h2>
      {action}
    </div>
  );
}

/** Topic links as soft pills, the same shape as the onboarding picker. */
export function TopicPills({
  topics,
  size = 'md',
  className,
}: {
  topics: { id?: string; slug: string; name: string }[];
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <ul className={cn('flex flex-wrap', size === 'sm' ? 'gap-1.5' : 'gap-2', className)}>
      {topics.map((topic) => (
        <li key={topic.id ?? topic.slug}>
          <Link
            href={`/topic/${topic.slug}`}
            className={cn(
              'inline-flex items-center rounded-full border border-transparent bg-sunken font-medium text-ink',
              'transition-[background-color,border-color] duration-200 hover:border-line-strong hover:bg-raised',
              size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-[14.5px]',
            )}
          >
            {topic.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Underlined, sentence-style text link. */
export const TEXT_LINK =
  'font-medium text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink';

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger"
    >
      {children}
    </p>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-line', className)} />;
}

/** A shared frame for dropdown menus and popovers. */
export const MENU_CLASS =
  'animate-pop-in z-50 overflow-hidden rounded-2xl border border-line bg-raised p-1.5 shadow-lift';

export const MENU_ITEM_CLASS =
  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-hover hover:text-ink [&>svg]:size-4 [&>svg]:shrink-0';
