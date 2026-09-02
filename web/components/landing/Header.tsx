import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { AuthTrigger } from "./AuthDialogProvider";
import styles from "./Header.module.css";

export async function SiteNav() {
  const session = await auth();

  return (
    <header className={styles.nav}>
      <span className={styles.wordmark}>dawere</span>
      <span className={styles.spacer} />
      {session?.user ? (
        <div className={styles.auth}>
          <Link href="/dashboard" className={styles.user}>
            {session.user.image && (
              <Image
                src={session.user.image}
                alt=""
                width={32}
                height={32}
                className={styles.avatar}
              />
            )}
            <span className={styles.userName}>{session.user.name}</span>
          </Link>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost">
              გასვლა
            </Button>
          </form>
        </div>
      ) : (
        <div className={styles.auth}>
          <AuthTrigger variant="ghost" className={styles.signin}>
            შესვლა
          </AuthTrigger>
          <AuthTrigger className={styles.cta}>უფასოდ დაწყება</AuthTrigger>
        </div>
      )}
    </header>
  );
}
