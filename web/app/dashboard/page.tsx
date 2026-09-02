import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) redirect("/");

  const { name, email, image } = session.user;

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.wordmark}>
          dawere
        </Link>
        <span className={styles.spacer} />
        <form action={signOutAction}>
          <Button type="submit" variant="ghost">
            გასვლა
          </Button>
        </form>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          {image && (
            <Image
              src={image}
              alt=""
              width={88}
              height={88}
              className={styles.avatar}
              priority
            />
          )}
          <h1 className={styles.name}>{name}</h1>
          <p className={styles.email}>{email}</p>
        </section>
      </main>
    </div>
  );
}
