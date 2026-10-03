import { Button } from "./button";
import { Glow } from "./glow";
import { PreviewFrame } from "./preview-frame";

export function Hero() {
  return (
    <section className="relative px-4 pt-14 sm:px-6 sm:pt-20">
      <Glow />

      <div className="mx-auto max-w-4xl text-center">
        <h1 className="animate-rise text-[clamp(2.5rem,7.5vw,5.25rem)] leading-[1.18] font-extrabold tracking-[-0.02em] text-balance">
          წერე. წაიკითხე.
          <br />
          ჰკითხე.
        </h1>
        <p className="animate-rise mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted [animation-delay:90ms] sm:mt-8 sm:text-xl">
          წაიკითხე ქართული ბლოგები და ჰკითხე ხელოვნურ ინტელექტს ყველაფერი, რაც გაუგებარია.
        </p>
        <div className="animate-rise mt-9 flex flex-col items-center justify-center gap-3 [animation-delay:180ms] sm:flex-row">
          <Button size="lg" href="/auth">
            დაიწყე წერა
          </Button>
          <Button size="lg" variant="secondary">
            წაიკითხე ბლოგები
          </Button>
        </div>
      </div>

      <div className="animate-rise mx-auto mt-16 max-w-5xl [animation-delay:280ms] sm:mt-20">
        <PreviewFrame />
      </div>
    </section>
  );
}
