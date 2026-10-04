import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { Header } from "@/components/header";
import { PostByline } from "@/components/post-byline";
import { db } from "@/lib/db";
import { posts, users } from "@/lib/db/schema";
import { postExtensions } from "@/lib/post-schema";
import { getCurrentUser } from "@/lib/session";
import { avatarUrl, formatDate, imageUrl, menuUser } from "@/lib/user-view";

type Props = { params: Promise<{ handle: string; post: string }> };

const getPost = cache(async (id: string) => {
  if (!/^[0-9a-f]{12}$/.test(id)) return null;
  const [row] = await db
    .select({ post: posts, author: users })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.userId))
    .where(eq(posts.id, id))
    .limit(1);
  return row ?? null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await getPost((await params).post);
  if (!row) return {};
  return { title: `${row.post.title} — dawere`, description: row.post.description };
}

export default async function PostPage({ params }: Props) {
  const { handle, post: id } = await params;
  const row = await getPost(id);
  const segment = decodeURIComponent(handle);
  if (!row || !segment.startsWith("@")) notFound();

  // The id finds the post; the handle is only for reading the URL, and it can change.
  const { post, author } = row;
  if (segment.slice(1).toLowerCase() !== author.handle) redirect(`/@${author.handle}/${post.id}`);

  const viewer = await getCurrentUser();
  if (viewer && !viewer.onboardedAt) redirect("/onboarding");

  return (
    <>
      <Header user={viewer ? menuUser(viewer) : undefined} />
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        <article>
          {post.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl(post.cover)} alt="" className="mb-8 w-full rounded-xl" />
          )}
          <h1 className="text-[clamp(1.75rem,5vw,2.5rem)] leading-tight font-extrabold tracking-[-0.015em] text-balance break-words">
            {post.title}
          </h1>
          <p className="mt-3 text-lg leading-relaxed break-words text-muted">{post.description}</p>

          <PostByline
            href={`/@${author.handle}`}
            name={author.name ?? ""}
            avatar={avatarUrl(author.avatar)}
            date={formatDate(post.createdAt)}
            dateTime={post.createdAt.toISOString()}
            canFollow={viewer?.id !== author.id}
            signedIn={Boolean(viewer)}
          />

          <div className="post-body mt-8">
            {renderToReactElement({ content: post.body, extensions: postExtensions })}
          </div>
        </article>
      </main>
    </>
  );
}
