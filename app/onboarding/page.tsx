import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Onboarding } from "@/components/onboarding";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "რეგისტრაცია — dawere",
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  if (user.onboardedAt) redirect("/");

  return (
    <div className="flex min-h-dvh flex-col">
      <Header bare />
      <main className="flex flex-1 flex-col px-4 pt-4 sm:px-6 sm:pt-[8vh] sm:pb-16">
        <Onboarding />
      </main>
    </div>
  );
}
