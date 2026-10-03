import { Button } from "./button";

export function ClosingCta() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-28 sm:px-6 sm:py-36">
      <div className="rounded-3xl border border-line bg-surface px-6 py-16 text-center sm:py-20">
        <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] leading-tight font-bold tracking-[-0.015em] text-balance">
          დაწერე პირველი ბლოგი
        </h2>
        <Button size="lg" className="mt-8">
          დაიწყე წერა
        </Button>
      </div>
    </section>
  );
}
