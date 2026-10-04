import { db } from "@/lib/db";
import { isForeignKeyViolation } from "@/lib/db/errors";
import { postViews } from "@/lib/db/schema";
import { postIdPattern } from "@/lib/ids";
import { getCurrentUser } from "@/lib/session";

const maxIds = 50;

// Feed cards the reader had on screen. The first sighting is kept, so later visits rank them lower.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.onboardedAt) return new Response(null, { status: 401 });

  let ids: unknown;
  try {
    ids = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (
    !Array.isArray(ids) ||
    ids.length > maxIds ||
    !ids.every((id) => typeof id === "string" && postIdPattern.test(id))
  ) {
    return new Response(null, { status: 400 });
  }
  if (ids.length === 0) return new Response(null, { status: 204 });

  try {
    await db
      .insert(postViews)
      .values([...new Set(ids as string[])].map((postId) => ({ userId: user.id, postId })))
      .onConflictDoNothing();
  } catch (error) {
    // A post deleted in the meantime; nothing worth recording then.
    if (!isForeignKeyViolation(error)) throw error;
  }
  return new Response(null, { status: 204 });
}
