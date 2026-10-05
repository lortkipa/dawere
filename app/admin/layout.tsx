import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/nav";
import { requireAdmin } from "@/lib/admin";
import { roleLabels } from "@/lib/roles";
import { avatarUrl } from "@/lib/user-view";

export const metadata: Metadata = {
  title: "ადმინი — dawere",
  robots: { index: false, follow: false },
};

// Its own shell, with nothing from the reader's side of the site.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <AdminNav
        user={{ name: user.name ?? "", email: user.email, avatar: avatarUrl(user.avatar), role: roleLabels[user.role] }}
      />
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
