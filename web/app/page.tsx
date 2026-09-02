import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthDialogProvider } from "@/components/landing/AuthDialogProvider";
import { Faq } from "@/components/landing/Faq";
import { Hero } from "@/components/landing/Hero";
import { SiteFooter } from "@/components/landing/Footer";
import { SiteNav } from "@/components/landing/Header";
import styles from "./page.module.css";

export default async function Home() {
  // The landing page only ever speaks to signed-out visitors — everything it
  // offers is behind the dashboard once you are in.
  const session = await auth();

  if (session?.user) redirect("/dashboard");

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
