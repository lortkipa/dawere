import { ButtonLink } from "@/components/ui/Button";
import styles from "./not-found.module.css";

export const metadata = {
  title: "გვერდი ვერ მოიძებნა · dawere",
};

export default function NotFound() {
  return (
    <main className={styles.main}>
      <p className={styles.code}>404</p>
      <h1 className={styles.heading}>ასეთი გვერდი არ არსებობს</h1>
      <p className={styles.note}>
        ბმული შეიძლება არასწორია, ან სტატია წაშლილია.
      </p>
      <ButtonLink href="/" className={styles.cta}>
        მთავარ გვერდზე
      </ButtonLink>
    </main>
  );
}
