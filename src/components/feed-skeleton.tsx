import { Skeleton } from '@/components/ui';

/** A loading placeholder shaped like a list of post cards. */
export function FeedSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="border-b border-line py-7">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="mt-4 flex gap-6">
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/5" />
            </div>
            <Skeleton className="size-20 rounded-xl sm:h-28 sm:w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}
