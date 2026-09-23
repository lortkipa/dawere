import { Skeleton } from '@/components/ui';

/** A loading placeholder shaped like a list of post cards. */
export function FeedSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="border-b border-line py-6 last:border-b-0">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="mt-3.5 space-y-2">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/5" />
          </div>
          <Skeleton className="mt-4 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
