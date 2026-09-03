import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/account";
import { AuthDialogProvider } from "@/components/landing/AuthDialogProvider";
import { Faq } from "@/components/landing/Faq";
import { Hero } from "@/components/landing/Hero";
import { SiteFooter } from "@/components/landing/Footer";
import { SiteNav } from "@/components/landing/Header";
import styles from "./page.module.css";

export default async function Home() {
  // The landing page only ever speaks to signed-out visitors — once you are in,
  // your own page is where everything it offers already is. It is also where
  // signing in lands, since the handle is only known once the row is read.
  const account = await currentAccount();

  if (account) redirect(`/${account.handle}`);

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
