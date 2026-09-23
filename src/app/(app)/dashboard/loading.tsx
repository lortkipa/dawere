import { Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10" aria-busy="true">
      <span className="sr-only" role="status">
        პანელი იტვირთება…
      </span>
      <Skeleton className="mb-8 h-10 w-48" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-4 h-64 rounded-2xl" />
    </main>
  );
}
