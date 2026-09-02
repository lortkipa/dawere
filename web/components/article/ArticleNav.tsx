import Link from "next/link";
import { AccountMenu } from "@/components/account/AccountMenu";
import { ButtonLink } from "@/components/ui/Button";
import type { Account } from "@/lib/account";
import styles from "./ArticleNav.module.css";

/**
 * The reader's header. An article is the one page signed-out visitors and
 * signed-in ones both land on, so the right-hand side is the only part that
 * differs between them.
 */
export function ArticleNav({ account }: { account: Account | null }) {
  return (
    <header className={styles.nav}>
      <Link href={account ? "/dashboard" : "/"} className={styles.wordmark}>
        dawere
      </Link>

      <span className={styles.spacer} />

      {account ? (
        <div className={styles.actions}>
          <ButtonLink
            variant="outline"
            href="/dashboard"
            className={`${styles.cta} ${styles.plain}`}
          >
            ჩემი სტატიები
          </ButtonLink>
          <AccountMenu account={account} />
        </div>
      ) : (
        <ButtonLink href="/" className={styles.cta}>
          უფასოდ დაწყება
        </ButtonLink>
      )}
    </header>
  );
}
