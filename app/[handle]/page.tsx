import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { Header } from "@/components/header";
import { Profile } from "@/components/profile";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/session";

type Props = { params: Promise<{ handle: string }> };

// A folder named `@…` would be a parallel-route slot, so `/@handle` is caught by this
// dynamic segment and anything without the `@` is a 404.
const getProfile = cache(async (segment: string) => {
  const decoded = decodeURIComponent(segment);
  if (!decoded.startsWith("@")) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.handle, decoded.slice(1)))
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

  return (
    <>
      <Header user={viewer ? { name: viewer.name, email: viewer.email, handle: viewer.handle } : undefined} />
      <main>
        <Profile
          user={{ name: profile.name ?? "", bio: profile.bio }}
          isOwner={viewer?.id === profile.id}
          signedIn={Boolean(viewer)}
        />
      </main>
    </>
  );
}
