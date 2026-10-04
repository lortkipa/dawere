import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache, Suspense } from "react";
import { Header } from "@/components/header";
import { Profile } from "@/components/profile";
import { ProfilePosts } from "@/components/profile-posts";
import { ProfilePostsSkeleton } from "@/components/skeleton";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getProfilePage } from "@/lib/feed";
import { followerCount, isFollowing } from "@/lib/follows";
import { getCurrentUser } from "@/lib/session";
import { menuUser } from "@/lib/user-view";

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
          posts={
            // Keyed, so moving to another profile starts a fresh list.
            <Suspense key={profile.id} fallback={<ProfilePostsSkeleton />}>
              <PostList authorId={profile.id} isOwner={isOwner} />
            </Suspense>
          }
          followers={followers}
          followed={followed}
          isOwner={isOwner}
          signedIn={Boolean(viewer)}
        />
      </main>
    </>
  );
}

async function PostList({ authorId, isOwner }: { authorId: string; isOwner: boolean }) {
  return <ProfilePosts authorId={authorId} first={await getProfilePage(authorId, null)} isOwner={isOwner} />;
}
