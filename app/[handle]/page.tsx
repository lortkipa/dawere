import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache, Suspense } from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/button";
import { EmptyState, PostList } from "@/components/feed";
import { LockedIllustration } from "@/components/empty-illustration";
import { Profile, type ProfileTab } from "@/components/profile";
import { FeedSkeleton } from "@/components/skeleton";
import { notBanned } from "@/lib/bans";
import { db } from "@/lib/db";
import { type User, users } from "@/lib/db/schema";
import { getFavoritesPage, getProfilePage } from "@/lib/feed";
import { followerCount, isFollowing } from "@/lib/follows";
import { getCurrentUser } from "@/lib/session";
import { menuUser } from "@/lib/user-view";

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

// A folder named `@…` would be a parallel-route slot, so `/@handle` is caught by this
// dynamic segment and anything without the `@` is a 404. Handles are stored lowercase, so
// `/@Niko` finds `@niko`.
const getProfile = cache(async (segment: string) => {
  const decoded = decodeURIComponent(segment);
  if (!decoded.startsWith("@")) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.handle, decoded.slice(1).toLowerCase()), notBanned))
    .limit(1);

  // Users who haven't finished onboarding have no name to show yet; banned ones are hidden.
  return user?.onboardedAt ? user : null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await getProfile((await params).handle);
  if (!profile) return {};
  return { title: `${profile.name} (@${profile.handle})`, description: profile.bio ?? undefined };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const profile = await getProfile((await params).handle);
  if (!profile) notFound();
  const tab: ProfileTab = (await searchParams).tab === "favorites" ? "favorites" : "posts";

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
          user={{
            id: profile.id,
            handle: profile.handle,
            name: profile.name ?? "",
            bio: profile.bio,
            avatar: profile.avatar,
            favoritesPublic: profile.favoritesPublic,
          }}
          tab={tab}
          posts={
            // Keyed, so moving to another profile or tab starts a fresh list.
            <Suspense key={`${profile.id}-${tab}`} fallback={<FeedSkeleton />}>
              {tab === "favorites" ? (
                <ProfileFavorites viewer={viewer} owner={profile} isOwner={isOwner} />
              ) : (
                <ProfilePosts viewer={viewer} authorId={profile.id} isOwner={isOwner} />
              )}
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

// The same cards as the home feed.
async function ProfilePosts({ viewer, authorId, isOwner }: { viewer: User | null; authorId: string; isOwner: boolean }) {
  return (
    <PostList
      first={await getProfilePage(viewer, authorId, null)}
      endpoint={`/api/posts?author=${authorId}`}
      viewerId={viewer?.id}
      empty={
        isOwner ? (
          <EmptyState title="ჯერ არაფერი დაგიწერია" text="შენი ბლოგები აქ გამოჩნდება.">
            <Button href="/write" variant="outline" className="mt-6">
              დაიწყე წერა
            </Button>
          </EmptyState>
        ) : (
          <EmptyState title="ჯერ ბლოგები არ არის" text="როცა ავტორი რამეს გამოაქვეყნებს, აქ გამოჩნდება." />
        )
      }
    />
  );
}

async function ProfileFavorites({ viewer, owner, isOwner }: { viewer: User | null; owner: User; isOwner: boolean }) {
  if (!owner.favoritesPublic && !isOwner) {
    return (
      <EmptyState
        title="რჩეულები დამალულია"
        text="ავტორმა რჩეულები მხოლოდ თავისთვის დატოვა."
        art={<LockedIllustration className="w-44 sm:w-52" />}
      />
    );
  }

  return (
    <PostList
      first={await getFavoritesPage(viewer, owner.id, null)}
      endpoint={`/api/favorites?user=${owner.id}`}
      viewerId={viewer?.id}
      empty={
        isOwner ? (
          <EmptyState title="ჯერ არაფერი შეგინახავს" text="ბლოგები, რომლებსაც რჩეულებში დაამატებ, აქ გამოჩნდება.">
            <Button href="/" variant="outline" className="mt-6">
              ბლოგების ნახვა
            </Button>
          </EmptyState>
        ) : (
          <EmptyState title="რჩეულები ცარიელია" text="ავტორს ჯერ არცერთი ბლოგი არ დაუმატებია." />
        )
      }
    />
  );
}
