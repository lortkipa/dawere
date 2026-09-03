import Link from "next/link";
import { AccountMenu } from "@/components/account/AccountMenu";
import { SearchField } from "@/components/nav/SearchField";
import { ButtonLink } from "@/components/ui/Button";
import { PencilIcon } from "@/components/icons/PencilIcon";
import type { Account } from "@/lib/account";
import styles from "./AppNav.module.css";

/**
 * The header for every page a signed-out visitor can also reach — an article, an
 * author's page, a search, and the reader's way back out of /settings. Only the
 * right-hand side differs between the two audiences; the field in the middle is
 * the same for both, because everything it finds is public.
 */
export function AppNav({
  account,
  query,
}: {
  account: Account | null;
  /** What /search is showing, so its own field opens holding the question. */
  query?: string;
}) {
  return (
    <header className={styles.nav}>
      {/* Home for a signed-in person is their feed; for everybody else it is
          the landing page, which is what `/` still serves them. Their own page
          is a door down, in the avatar menu, because it is where they publish
          to rather than where they read. */}
      <Link href={account ? "/feed" : "/"} className={styles.wordmark}>
        dawere
      </Link>

      <SearchField query={query} />

      <div className={styles.actions}>
        {account ? (
          <>
            {/* Writing is the one thing the top bar offers that the avatar menu
                underneath it does not — the way to an author's own page is in
                there, and repeating it here would be the same door twice. */}
            <ButtonLink href="/write" className={styles.cta}>
              <PencilIcon />
              <span className={styles.ctaLabel}>სტატიის დაწერა</span>
            </ButtonLink>
            <AccountMenu account={account} />
          </>
        ) : (
          <ButtonLink href="/" className={styles.cta}>
            უფასოდ დაწყება
          </ButtonLink>
        )}
      </div>
    </header>
  );
}
