import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Glow } from "@/components/glow";
import { Header } from "@/components/header";
import { LightOnly } from "@/components/light-only";
import { safeNext } from "@/lib/return-to";
import { getCurrentUser } from "@/lib/session";
import { themeColors } from "@/lib/theme-options";

export const metadata: Metadata = {
  title: "შესვლა — dawere",
};

// Always light, whatever the theme.
export const viewport: Viewport = { themeColor: themeColors.light };

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(user.onboardedAt ? (safeNext((await searchParams).next) ?? "/") : "/onboarding");

  return (
    <div className="flex min-h-dvh flex-col">
      <LightOnly />
      <Header bare />
      <main className="relative flex-1 px-4 pt-[12vh] pb-16 sm:px-6 sm:pt-[18vh]">
        <Glow />
        <div className="animate-rise mx-auto w-full max-w-sm">
          <AuthForm />
        </div>
      </main>
    </div>
  );
}
