import { cn } from '@/lib/utils';

/** The wordmark on its own — no symbol beside it. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('text-[21px] leading-none font-bold tracking-tight text-ink lowercase', className)}>
      dawere
    </span>
  );
}
