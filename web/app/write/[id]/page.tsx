import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { Editor } from "@/components/editor/Editor";
import { accountFrom } from "@/lib/account";

export const metadata: Metadata = {
  title: "რედაქტირება · dawere",
};

export default async function EditArticlePage(props: PageProps<"/write/[id]">) {
  const session = await auth();

  if (!session?.user?.id) redirect("/");

  const { id } = await props.params;

  // Scoped by author, so someone else's id is a 404 rather than a 403 — there
  // is no reason to confirm that the article exists.
  const article = await db.query.articles.findFirst({
    columns: { id: true, title: true, html: true, slug: true, status: true },
    where: and(eq(articles.id, id), eq(articles.authorId, session.user.id)),
  });

  if (!article) notFound();

  return <Editor account={accountFrom(session)} article={article} />;
}
