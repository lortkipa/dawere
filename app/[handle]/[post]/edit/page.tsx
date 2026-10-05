import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { updateOwnPost } from "@/app/write/actions";
import { Header } from "@/components/header";
import { Writer } from "@/components/writer";
import { getCategories } from "@/lib/categories";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { postIdPattern } from "@/lib/ids";
import { authUrl } from "@/lib/return-to";
import { getCurrentUser } from "@/lib/session";
import { imageUrl, menuUser } from "@/lib/user-view";

type Props = { params: Promise<{ handle: string; post: string }> };

export const metadata: Metadata = { title: "რედაქტირება — dawere" };

// Only the author gets here; to anyone else the page doesn't exist.
export default async function EditPostPage({ params }: Props) {
  const { handle, post: id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(authUrl(`/${decodeURIComponent(handle)}/${id}/edit`));
  if (!user.onboardedAt) redirect("/onboarding");
  if (!postIdPattern.test(id)) notFound();

  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.userId, user.id)))
    .limit(1);
  if (!post) notFound();

  return (
    <>
      <Header user={menuUser(user)} />
      <main>
        <Writer
          topics={await getCategories()}
          initial={{
            cover: post.cover ? imageUrl(post.cover) : null,
            title: post.title,
            description: post.description,
            tags: post.tags,
            body: post.body,
          }}
          submit={updateOwnPost.bind(null, post.id)}
          submitLabel="შენახვა"
        />
      </main>
    </>
  );
}
