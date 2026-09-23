import { FeedSkeleton } from '@/components/feed-skeleton';
import { Skeleton } from '@/components/ui';

/**
 * Search never 404s or redirects, so it can stream behind a skeleton without
 * losing a status code. (Pages that can — posts, profiles, topics — have none.)
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6 pb-16 sm:px-6 sm:pt-10" aria-busy="true">
      <span className="sr-only" role="status">
        იტვირთება…
      </span>
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="mt-6 mb-8 h-10 w-2/3" />
      <FeedSkeleton rows={3} />
    </main>
  );
}
