import { AuthTrigger } from "./AuthDialogProvider";
import { HeroArt } from "./HeroArt";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.section}>
      <div className={styles.copy}>
        <h1 className={styles.title}>
          <span>ბლოგი, რომელსაც</span>
          <span>კითხვას უსვამ</span>
        </h1>
        <div className={styles.cta}>
          <AuthTrigger size="lg">კითხვის დაწყება</AuthTrigger>
        </div>
      </div>

      <div className={styles.art}>
        <HeroArt />
      </div>
    </section>
  );
}
