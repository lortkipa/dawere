// Gray stand-ins with the shape of what is loading. One light band sweeps across all of them at
// once (see `.bone` in globals.css).

export function Bone({ className = "" }: { className?: string }) {
  return <div className={`bone rounded ${className}`} />;
}

// Varied line lengths, so a column of placeholders doesn't look stamped.
const titleWidths = ["w-11/12", "w-full", "w-4/5"];
const secondLineWidths = ["w-3/5", "w-2/5", "w-1/2"];

function Loading({ children }: { children: React.ReactNode }) {
  return (
    <div role="status">
      <span className="sr-only">იტვირთება</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

// Mirrors a feed card: author line, title, description, actions and the cover on the right. The
// cards rise in one after another while the shimmer sweeps across them.
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Loading>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="animate-rise border-b border-line py-6"
          style={{ animationDelay: `${index * 120}ms` }}
        >
          <div className="flex items-center gap-2">
            <Bone className="size-5 rounded-full" />
            <Bone className="h-3.5 w-28" />
            <Bone className="h-3.5 w-14" />
          </div>
          <div className="mt-3 flex gap-6 sm:gap-10">
            <div className="min-w-0 flex-1">
              <Bone className={`h-6 sm:h-7 ${titleWidths[index % 3]}`} />
              <Bone className={`mt-2 h-6 sm:h-7 ${secondLineWidths[index % 3]}`} />
              <Bone className="mt-3 hidden h-4 w-5/6 sm:block" />
              <div className="mt-5 flex gap-4">
                <Bone className="h-5 w-11 rounded-full" />
                <Bone className="h-5 w-9 rounded-full" />
                <Bone className="h-5 w-6 rounded-full" />
              </div>
            </div>
            <Bone className="h-16 w-24 shrink-0 rounded-md sm:h-28 sm:w-40" />
          </div>
        </div>
      ))}
    </Loading>
  );
}
