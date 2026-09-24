import { FeedSkeleton } from '@/components/feed-skeleton';
import { Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-12 pb-20 sm:px-6 sm:pt-20" aria-busy="true">
      <span className="sr-only" role="status">
        იტვირთება…
      </span>
      <Skeleton className="mb-8 h-11 w-52 rounded-lg" />
      <div className="border-t border-line pt-4">
        <FeedSkeleton />
      </div>
    </main>
  );
}
