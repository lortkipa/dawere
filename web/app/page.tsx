import { AuthDialogProvider } from "@/components/landing/AuthDialogProvider";
import { Faq } from "@/components/landing/Faq";
import { Hero } from "@/components/landing/Hero";
import { SiteFooter } from "@/components/landing/Footer";
import { SiteNav } from "@/components/landing/Header";
import styles from "./page.module.css";

export default function Home() {
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
