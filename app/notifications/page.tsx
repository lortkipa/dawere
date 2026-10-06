import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { headingClasses } from "@/components/heading";
import { Notifications } from "@/components/notifications";
import { getNotificationsPage } from "@/lib/notifications";
import { authUrl } from "@/lib/return-to";
import { getCurrentUser } from "@/lib/session";
import { menuUser } from "@/lib/user-view";

export const metadata: Metadata = { title: "შეტყობინებები — dawere" };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect(authUrl("/notifications"));
  if (!user.onboardedAt) redirect("/onboarding");

  const { newest, ...first } = await getNotificationsPage(user.id, null);

  return (
    <>
      <Header user={menuUser(user)} />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <h1 className={headingClasses}>შეტყობინებები</h1>
        <Notifications first={first} newest={newest} />
      </main>
    </>
  );
}
