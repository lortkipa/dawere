import { cn } from '@/lib/utils';

/** The wordmark on its own — no symbol beside it. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('text-[20px] leading-none font-bold tracking-tight text-ink lowercase', className)}>
      dawere
    </span>
  );
}

/** The square monogram, for places too narrow for the wordmark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex size-8 items-center justify-center rounded-lg bg-primary text-[17px] leading-none font-bold text-primary-contrast',
        className,
      )}
      aria-hidden
    >
      d
    </span>
  );
}
