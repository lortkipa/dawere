import { FeedSkeleton } from '@/components/feed-skeleton';
import { Skeleton } from '@/components/ui';

/**
 * Search never 404s or redirects, so it can stream behind a skeleton without
 * losing a status code. (Pages that can — posts, profiles, topics — have none.)
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 pt-8 pb-24 sm:px-6 sm:pt-12" aria-busy="true">
      <span className="sr-only" role="status">
        იტვირთება…
      </span>
      <Skeleton className="h-14 rounded-full" />
      <div className="mt-5 flex gap-1.5">
        {['w-16', 'w-22', 'w-20', 'w-16'].map((width, index) => (
          <Skeleton key={index} className={`h-9 rounded-full ${width}`} />
        ))}
      </div>
      <div className="mt-12">
        <FeedSkeleton rows={3} />
      </div>
    </main>
  );
}
