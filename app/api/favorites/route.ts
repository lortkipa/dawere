import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getFavoritesPage } from "@/lib/feed";
import { uuidPattern } from "@/lib/ids";
import { getCurrentUser } from "@/lib/session";

// Later pages of a user's favorites; the first one comes with the page. Private favorites are
// only for their owner.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ownerId = searchParams.get("user") ?? "";
  if (!uuidPattern.test(ownerId)) return Response.json({ error: "not found" }, { status: 404 });

  const [owner] = await db
    .select({ favoritesPublic: users.favoritesPublic })
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1);
  const viewer = await getCurrentUser();
  const reader = viewer?.onboardedAt ? viewer : null;
  if (!owner || (!owner.favoritesPublic && reader?.id !== ownerId)) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json(await getFavoritesPage(reader, ownerId, searchParams.get("cursor")));
}
