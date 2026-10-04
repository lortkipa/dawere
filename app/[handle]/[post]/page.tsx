import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { Comments } from "@/components/comments";
import { Header } from "@/components/header";
import { PostActions } from "@/components/post-actions";
import { PostByline } from "@/components/post-byline";
import { getPostComments } from "@/lib/comments";
import { db } from "@/lib/db";
import { isFavorite } from "@/lib/favorites";
import { isFollowing } from "@/lib/follows";
import { postIdPattern } from "@/lib/ids";
import { postLikeState } from "@/lib/likes";
import { postViews, posts, users } from "@/lib/db/schema";
import { postExtensions } from "@/lib/post-schema";
import { getCurrentUser } from "@/lib/session";
import { avatarUrl, formatDate, imageUrl, menuUser } from "@/lib/user-view";

type Props = { params: Promise<{ handle: string; post: string }> };

const getPost = cache(async (id: string) => {
  if (!postIdPattern.test(id)) return null;
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
  const canFollow = viewer?.id !== author.id;
  const [followed, likes, thread, favorited] = await Promise.all([
    viewer && canFollow ? isFollowing(viewer.id, author.id) : false,
    postLikeState(post.id, viewer?.id),
    getPostComments(post.id, viewer?.id),
    viewer ? isFavorite(post.id, viewer.id) : false,
    // Opened posts sink far down this reader's feed on later visits.
    viewer && canFollow
      ? db
          .insert(postViews)
          .values({ userId: viewer.id, postId: post.id, openedAt: new Date() })
          .onConflictDoUpdate({ target: [postViews.userId, postViews.postId], set: { openedAt: new Date() } })
      : null,
  ]);

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
            authorId={author.id}
            followed={followed}
            canFollow={canFollow}
            signedIn={Boolean(viewer)}
          />

          <div className="post-body mt-8">
            {renderToReactElement({ content: post.body, extensions: postExtensions })}
          </div>
        </article>

        <PostActions
          postId={post.id}
          signedIn={Boolean(viewer)}
          liked={likes.liked}
          likes={likes.count}
          favorited={favorited}
          comments={thread.total}
        />
        <Comments
          postId={post.id}
          viewer={viewer ? { avatar: avatarUrl(viewer.avatar) } : null}
          comments={thread.comments}
          total={thread.total}
        />
      </main>
    </>
  );
}
