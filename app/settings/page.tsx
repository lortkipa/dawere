import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Settings } from "@/components/settings";
import { getCurrentUser } from "@/lib/session";
import { menuUser } from "@/lib/user-view";

export const metadata: Metadata = { title: "პარამეტრები — dawere" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  if (!user.onboardedAt) redirect("/onboarding");

  // Shown in the handle dialog as a preview of the new profile link.
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";

  return (
    <>
      <Header user={menuUser(user)} />
      <main>
        <Settings
          user={{
            email: user.email,
            handle: user.handle,
            name: user.name ?? "",
            bio: user.bio,
            avatar: user.avatar,
            topics: user.topics ?? [],
          }}
          host={host}
        />
      </main>
    </>
  );
}
