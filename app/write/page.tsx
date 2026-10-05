import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { Writer } from "@/components/writer";
import { getCategories } from "@/lib/categories";
import { authUrl } from "@/lib/return-to";
import { getCurrentUser } from "@/lib/session";
import { menuUser } from "@/lib/user-view";

export const metadata: Metadata = { title: "დაწერე — dawere" };

export default async function WritePage() {
  const user = await getCurrentUser();
  if (!user) redirect(authUrl("/write"));
  if (!user.onboardedAt) redirect("/onboarding?next=%2Fwrite");

  return (
    <>
      <Header user={menuUser(user)} />
      <main>
        <Writer topics={await getCategories()} />
      </main>
    </>
  );
}
