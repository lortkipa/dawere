import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn, avatarColor, initials } from '@/lib/utils';

/* -------------------------------------------------------------------- button */

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap ' +
  'transition-[background-color,color,border-color,box-shadow,transform] active:scale-[0.98] ' +
  'disabled:pointer-events-none disabled:opacity-50 [&>svg]:shrink-0';

const BUTTON_VARIANTS = {
  primary: 'bg-primary text-primary-contrast shadow-sm shadow-black/10 hover:bg-primary-hover',
  accent: 'bg-accent text-accent-contrast shadow-sm shadow-accent/20 hover:bg-accent-hover',
  outline: 'border border-line-strong bg-raised text-ink hover:border-ink/25 hover:bg-hover',
  soft: 'bg-sunken text-ink hover:bg-hover',
  ghost: 'text-muted hover:bg-hover hover:text-ink',
  danger: 'border border-danger/30 bg-danger-soft text-danger hover:bg-danger hover:text-white',
} as const;

const BUTTON_SIZES = {
  sm: 'h-9 px-3.5 text-[13px] [&>svg]:size-4',
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
  'w-full rounded-xl border border-line bg-raised px-3.5 py-2.5 text-[15px] text-ink placeholder:text-subtle ' +
  'transition-colors hover:border-line-strong focus:border-accent focus:outline-none ' +
  'focus:ring-2 focus:ring-accent/20 disabled:opacity-60';

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
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
        </label>
        {hint ? <span className="text-[13px] text-subtle">{hint}</span> : null}
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
  sm: 'size-9 text-[13px]',
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
  return <div className={cn('rounded-2xl border border-line bg-raised shadow-soft', className)} {...props} />;
}

const BADGE_TONES = {
  neutral: 'bg-sunken text-muted',
  accent: 'bg-accent-soft text-accent',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
  danger: 'bg-danger-soft text-danger',
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
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap [&>svg]:size-3',
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
  return <div className={cn('shimmer rounded-lg', className)} aria-hidden />;
}

export function Chip({
  children,
  className,
  active,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-medium transition-colors',
        active
          ? 'border-accent/30 bg-accent-soft text-accent'
          : 'border-line bg-sunken text-muted hover:border-line-strong hover:text-ink',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function TopicChip({ slug, name, active }: { slug: string; name: string; active?: boolean }) {
  return (
    <Link href={`/topic/${slug}`}>
      <Chip active={active}>{name}</Chip>
    </Link>
  );
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
    <header className={cn('mb-8 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="font-serif text-[28px] leading-tight font-semibold tracking-tight text-ink sm:text-[32px]">
          {title}
        </h1>
        {description ? <p className="mt-1.5 text-[15px] text-muted">{description}</p> : null}
      </div>
      {action}
      {children}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-3xl border border-dashed border-line-strong/70 bg-raised/40 px-6 py-16 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent [&>svg]:size-6">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

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
    <div className={cn('mb-4 flex items-center justify-between gap-4', className)}>
      <h2 className="text-[13px] font-semibold tracking-wide text-subtle uppercase">{children}</h2>
      {action}
    </div>
  );
}

export function FormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
    >
      {children}
    </p>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-line', className)} />;
}
