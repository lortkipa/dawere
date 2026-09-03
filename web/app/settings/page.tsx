import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, articles, users } from "@/db/schema";
import { currentAccount } from "@/lib/account";
import { formatDate } from "@/lib/date";
import { siteOrigin } from "@/lib/url";
import { AppNav } from "@/components/nav/AppNav";
import { SiteFooter } from "@/components/landing/Footer";
import { DeleteAccount } from "@/components/settings/DeleteAccount";
import { ProfileForm } from "@/components/settings/ProfileForm";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "პარამეტრები · dawere",
};

export default async function SettingsPage() {
  const account = await currentAccount();

  if (!account) redirect("/");

  // Four things the page needs and one round trip to get them in.
  const [[profile], links, [totals], origin] = await Promise.all([
    db
      .select({ bio: users.bio, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, account.id)),
    db
      .select({ provider: accounts.provider })
      .from(accounts)
      .where(eq(accounts.userId, account.id)),
    db
      .select({ articles: count() })
      .from(articles)
      .where(eq(articles.authorId, account.id)),
    siteOrigin(),
  ]);

  return (
    <div className={styles.page}>
      <AppNav account={account} />

      <main className={styles.main}>
        <h1 className={styles.heading}>პარამეტრები</h1>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>პროფილი</h2>
          <p className={styles.cardNote}>
            სახელი, მისამართი და ტექსტი შენს გვერდზე ყველას უჩანს.
          </p>

          <ProfileForm
            account={account}
            bio={profile.bio}
            origin={origin}
          />
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>ანგარიში</h2>

          <dl className={styles.rows}>
            <div className={styles.row}>
              <dt className={styles.rowLabel}>ელფოსტა</dt>
              <dd className={styles.rowValue}>{account.email}</dd>
            </div>
            <div className={styles.row}>
              <dt className={styles.rowLabel}>შესვლა</dt>
              <dd className={styles.rowValue}>
                {links.map(({ provider }) => providerName(provider)).join(", ") ||
                  "—"}
              </dd>
            </div>
            <div className={styles.row}>
              <dt className={styles.rowLabel}>რეგისტრაციის თარიღი</dt>
              <dd className={styles.rowValue}>
                {formatDate(profile.createdAt)}
              </dd>
            </div>
          </dl>

          {/* The email is the identity every provider is matched on — changing
              it would mean changing who the account is. */}
          <p className={styles.cardNote}>
            ანგარიშს ელფოსტა განსაზღვრავს, ამიტომ მისი შეცვლა ჯერ არ
            შეიძლება.
          </p>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>შენი მონაცემები</h2>
          <p className={styles.cardNote}>
            ყველა სტატია — მონახაზებიც — ერთ JSON ფაილად, სრული ტექსტით.
            რასაც დაწერ, შენია.
          </p>

          {/* A plain link to a GET endpoint: the file is built on request and
              streams straight to the browser's downloads. */}
          <a className={styles.download} href="/api/export" download>
            ჩამოტვირთვა
          </a>
        </section>

        <section className={`${styles.card} ${styles.danger}`}>
          <h2 className={styles.cardTitle}>ანგარიშის წაშლა</h2>
          <p className={styles.cardNote}>
            ანგარიშთან ერთად ქრება ყველაფერი, რაც დაწერე, და ყველა ბმული, რაც
            გაავრცელე. დაბრუნება არ იქნება შესაძლებელი.
          </p>

          <DeleteAccount articles={totals.articles} />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/** `google` is how the row spells it; Google is how a person does. */
function providerName(provider: string): string {
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}
