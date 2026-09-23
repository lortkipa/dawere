import { Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-12" aria-busy="true">
      <span className="sr-only" role="status">
        იტვირთება…
      </span>
      <div className="mb-6 flex items-end justify-between">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-8 w-36" />
      </div>
      <Skeleton className="mb-4 h-10 w-full" />
      <div className="space-y-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
