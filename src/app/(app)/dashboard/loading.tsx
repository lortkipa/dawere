import { Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-12 pb-20 sm:px-6 sm:pt-20" aria-busy="true">
      <span className="sr-only" role="status">
        პანელი იტვირთება…
      </span>
      <Skeleton className="mb-10 h-11 w-44 rounded-lg" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="mt-4 h-72 rounded-2xl" />
    </main>
  );
}
