import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Feed, FeedLoading } from "@/components/feed";
import { Header } from "@/components/header";
import type { Metadata } from "next";
import { getFeedPage } from "@/lib/feed";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "ბლოგები — dawere" };

// The feed for readers without an account. Signed-in readers have theirs on the home page.
export default async function GuestFeedPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <>
      <Header />
      <main>
        <Suspense fallback={<FeedLoading />}>
          <GuestFeed />
        </Suspense>
      </main>
    </>
  );
}

async function GuestFeed() {
  return <Feed first={await getFeedPage(null, null)} />;
}
