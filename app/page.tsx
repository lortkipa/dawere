import { redirect } from "next/navigation";
import { Bento } from "@/components/bento";
import { ClosingCta } from "@/components/closing-cta";
import { Feed } from "@/components/feed";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { fakePosts } from "@/lib/fake-feed";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  const user = await getCurrentUser();
  if (user && !user.onboardedAt) redirect("/onboarding");
  if (user) {
    return (
      <>
        <Header user={{ name: user.name, email: user.email, handle: user.handle }} />
        <main>
          <Feed posts={fakePosts} />
        </main>
      </>
    );
  }

  return (
    <>
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
