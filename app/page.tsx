import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Bento } from "@/components/bento";
import { ClosingCta } from "@/components/closing-cta";
import { Feed, FeedLoading } from "@/components/feed";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { LightOnly } from "@/components/light-only";
import type { Viewport } from "next";
import type { User } from "@/lib/db/schema";
import { getFeedPage } from "@/lib/feed";
import { getCurrentUser } from "@/lib/session";
import { themeColors } from "@/lib/theme-options";
import { menuUser } from "@/lib/user-view";

// The landing page is always light; the feed keeps the reader's theme from the root layout.
export async function generateViewport(): Promise<Viewport> {
  return (await getCurrentUser()) ? {} : { themeColor: themeColors.light };
}

export default async function Home() {
  const user = await getCurrentUser();
  if (user && !user.onboardedAt) redirect("/onboarding");
  if (user) {
    return (
      <>
        <Header user={menuUser(user)} />
        <main>
          <Suspense fallback={<FeedLoading />}>
            <HomeFeed user={user} />
          </Suspense>
        </main>
      </>
    );
  }

  return (
    <>
      <LightOnly />
      <Header />
      <main>
        <Hero />
        <Bento />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}

// Streams in after the header, with the skeleton in its place until then.
async function HomeFeed({ user }: { user: User }) {
  return <Feed first={await getFeedPage(user, null)} viewerId={user.id} />;
}
