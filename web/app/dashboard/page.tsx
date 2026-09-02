import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { EmptyState } from "@/components/dashboard/EmptyState";
import styles from "./page.module.css";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) redirect("/");

  const { name, email, image } = session.user;

  return (
    <div className={styles.page}>
      <DashboardNav
        name={name ?? email ?? ""}
        email={email ?? ""}
        image={image ?? null}
      />
      <EmptyState />
    </div>
  );
}
