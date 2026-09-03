import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/account";
import { AuthDialogProvider } from "@/components/landing/AuthDialogProvider";
import { Faq } from "@/components/landing/Faq";
import { Hero } from "@/components/landing/Hero";
import { SiteFooter } from "@/components/landing/Footer";
import { SiteNav } from "@/components/landing/Header";
import styles from "./page.module.css";

export default async function Home() {
  // The landing page only ever speaks to signed-out visitors. `/` is also where
  // signing in comes back to, so it is this redirect that decides where a
  // signed-in person actually starts: the feed, which needs nothing read from
  // the row to address.
  const account = await currentAccount();

  if (account) redirect("/feed");

  return (
    <AuthDialogProvider>
      <div className={styles.page}>
        <SiteNav />
        <Hero />
        <Faq />
        <SiteFooter />
      </div>
    </AuthDialogProvider>
  );
}
