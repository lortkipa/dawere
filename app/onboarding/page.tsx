import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { LightOnly } from "@/components/light-only";
import { Onboarding } from "@/components/onboarding";
import { getCategories } from "@/lib/categories";
import { authUrl, safeNext } from "@/lib/return-to";
import { getCurrentUser } from "@/lib/session";
import { themeColors } from "@/lib/theme-options";

export const metadata: Metadata = {
  title: "რეგისტრაცია — dawere",
};

// Always light, like the landing and auth pages.
export const viewport: Viewport = { themeColor: themeColors.light };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const user = await getCurrentUser();
  if (!user) redirect(authUrl(next));
  if (user.onboardedAt) redirect(next ?? "/");

  return (
    <div className="flex min-h-dvh flex-col">
      <LightOnly />
      <Header bare />
      <main className="flex flex-1 flex-col px-4 pt-4 sm:px-6 sm:pt-[8vh] sm:pb-16">
        <Onboarding topics={await getCategories()} initialName={user.name ?? ""} />
      </main>
    </div>
  );
}
