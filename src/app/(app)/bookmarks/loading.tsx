import { FeedSkeleton } from '@/components/feed-skeleton';
import { Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-12" aria-busy="true">
      <span className="sr-only" role="status">
        იტვირთება…
      </span>
      <Skeleton className="mb-8 h-10 w-48" />
      <FeedSkeleton />
    </main>
  );
}
