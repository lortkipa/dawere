import { FeedSkeleton } from '@/components/feed-skeleton';
import { Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10" aria-busy="true">
      <span className="sr-only" role="status">
        იტვირთება…
      </span>
      <Skeleton className="mb-8 h-10 w-48" />
      <FeedSkeleton />
    </main>
  );
}
