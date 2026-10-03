import type { Metadata } from "next";
import { Button } from "@/components/button";
import { EmptyIllustration } from "@/components/empty-illustration";
import { Header } from "@/components/header";
import { getCurrentUser } from "@/lib/session";
import { menuUser } from "@/lib/user-view";

export const metadata: Metadata = { title: "გვერდი ვერ მოიძებნა — dawere" };

// Shown for unknown profiles (`notFound()` in `[handle]`) and any other missing URL.
export default async function NotFound() {
  const viewer = await getCurrentUser();

  return (
    <>
      <Header user={viewer?.onboardedAt ? menuUser(viewer) : undefined} />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <div className="flex flex-col items-center rounded-xl border border-line px-6 py-12 text-center sm:py-16">
          <EmptyIllustration className="w-44 sm:w-52" />
          <h1 className="mt-6 text-xl font-semibold text-ink sm:text-2xl">ეს გვერდი არ არსებობს</h1>
          <p className="mt-2 text-muted">ბმული შეიძლება არასწორია ან პროფილი აღარ არსებობს.</p>
          <Button href="/" variant="outline" className="mt-6">
            მთავარ გვერდზე დაბრუნება
          </Button>
        </div>
      </main>
    </>
  );
}
