import { Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-12" aria-busy="true">
      <span className="sr-only" role="status">
        პანელი იტვირთება…
      </span>
      <Skeleton className="mb-8 h-10 w-48" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="mt-4 h-64 rounded-xl" />
    </main>
  );
}
