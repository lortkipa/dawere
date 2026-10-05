import { ReadingDesktopMock, ReadingPhoneMock } from "./mockups";

export function PreviewFrame() {
  return (
    <>
      <div className="mx-auto w-full max-w-[280px] rounded-[2.75rem] border border-line bg-bg p-2.5 shadow-[0_40px_80px_-30px_rgba(17,17,17,0.3)] sm:hidden">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[2.25rem] bg-bg">
          <ReadingPhoneMock />
          <span className="absolute top-3 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-ink" />
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-line bg-bg shadow-[0_40px_90px_-30px_rgba(17,17,17,0.25)] sm:block">
        <div className="flex h-10 items-center gap-2 border-b border-line px-4">
          <span className="size-3 rounded-full bg-line" />
          <span className="size-3 rounded-full bg-line" />
          <span className="size-3 rounded-full bg-line" />
        </div>
        <div className="relative aspect-[16/10]">
          <ReadingDesktopMock />
        </div>
      </div>
    </>
  );
}
