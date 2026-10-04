import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { Header } from "@/components/header";
import { Profile } from "@/components/profile";
import { db } from "@/lib/db";
import { followerCount, isFollowing } from "@/lib/follows";
import { posts, users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";
import { formatDate, menuUser } from "@/lib/user-view";

type Props = { params: Promise<{ handle: string }> };

// A folder named `@…` would be a parallel-route slot, so `/@handle` is caught by this
// dynamic segment and anything without the `@` is a 404. Handles are stored lowercase, so
// `/@Niko` finds `@niko`.
const getProfile = cache(async (segment: string) => {
  const decoded = decodeURIComponent(segment);
  if (!decoded.startsWith("@")) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.handle, decoded.slice(1).toLowerCase()))
    .limit(1);

  // Users who haven't finished onboarding have no name to show yet.
  return user?.onboardedAt ? user : null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await getProfile((await params).handle);
  if (!profile) return {};
  return { title: `${profile.name} (@${profile.handle})`, description: profile.bio ?? undefined };
}

export default async function ProfilePage({ params }: Props) {
  const profile = await getProfile((await params).handle);
  if (!profile) notFound();

  const viewer = await getCurrentUser();
  if (viewer && !viewer.onboardedAt) redirect("/onboarding");

  const list = await db
    .select({ id: posts.id, title: posts.title, description: posts.description, cover: posts.cover, createdAt: posts.createdAt })
    .from(posts)
    .where(eq(posts.userId, profile.id))
    .orderBy(desc(posts.createdAt));
  const isOwner = viewer?.id === profile.id;
  const [followers, followed] = await Promise.all([
    followerCount(profile.id),
    viewer && !isOwner ? isFollowing(viewer.id, profile.id) : false,
  ]);

  return (
    <>
      <Header user={viewer ? menuUser(viewer) : undefined} />
      <main>
        <Profile
          user={{ id: profile.id, name: profile.name ?? "", bio: profile.bio, avatar: profile.avatar }}
          posts={list.map((post) => ({
            href: `/@${profile.handle}/${post.id}`,
            title: post.title,
            description: post.description,
            cover: post.cover,
            date: formatDate(post.createdAt),
          }))}
          followers={followers}
          followed={followed}
          isOwner={isOwner}
          signedIn={Boolean(viewer)}
        />
      </main>
    </>
  );
}
