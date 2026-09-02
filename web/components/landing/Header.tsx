import { AuthTrigger } from "./AuthDialogProvider";
import styles from "./Header.module.css";

export function SiteNav() {
  return (
    <header className={styles.nav}>
      <span className={styles.wordmark}>dawere</span>
      <span className={styles.spacer} />
      <div className={styles.auth}>
        <AuthTrigger variant="ghost" className={styles.signin}>
          შესვლა
        </AuthTrigger>
        <AuthTrigger className={styles.cta}>უფასოდ დაწყება</AuthTrigger>
      </div>
    </header>
  );
}
