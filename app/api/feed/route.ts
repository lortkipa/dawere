import type { NextRequest } from "next/server";
import { getFeedPage } from "@/lib/feed";
import { getCurrentUser } from "@/lib/session";

// Later pages of the home feed; the first one comes with the page.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.onboardedAt) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await getFeedPage(user, request.nextUrl.searchParams.get("cursor")));
}
