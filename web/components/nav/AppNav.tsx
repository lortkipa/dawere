import Link from "next/link";
import { AccountMenu } from "@/components/account/AccountMenu";
import { ButtonLink } from "@/components/ui/Button";
import { PencilIcon } from "@/components/icons/PencilIcon";
import type { Account } from "@/lib/account";
import styles from "./AppNav.module.css";

/**
 * The header for every page a signed-out visitor can also reach — an article, an
 * author's page, and the reader's way back out of /settings. Only the right-hand
 * side differs between the two audiences.
 */
export function AppNav({ account }: { account: Account | null }) {
  return (
    <header className={styles.nav}>
      {/* Home for a signed-in person is their own page; for everybody else it
          is the landing page, which is what `/` still serves them. */}
      <Link href={account ? `/${account.handle}` : "/"} className={styles.wordmark}>
        dawere
      </Link>

      <span className={styles.spacer} />

      {account ? (
        <div className={styles.actions}>
          {/* Writing is the one thing the top bar offers that the avatar menu
              underneath it does not — the way to an author's own page is in
              there, and repeating it here would be the same door twice. */}
          <ButtonLink href="/write" className={styles.cta}>
            <PencilIcon />
            <span className={styles.ctaLabel}>სტატიის დაწერა</span>
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
