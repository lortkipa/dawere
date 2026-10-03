import { redirect } from "next/navigation";
import { Bento } from "@/components/bento";
import { ClosingCta } from "@/components/closing-cta";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { UserInfo } from "@/components/user-info";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  const user = await getCurrentUser();
  if (user && !user.onboardedAt) redirect("/onboarding");
  if (user) return <UserInfo user={user} />;

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
