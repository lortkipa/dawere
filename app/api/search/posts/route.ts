import type { NextRequest } from "next/server";
import { searchPosts } from "@/lib/search";
import { getCurrentUser } from "@/lib/session";

// Later pages of the search page's posts; the first one comes with the page.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const viewer = await getCurrentUser();
  return Response.json(
    await searchPosts(viewer?.onboardedAt ? viewer : null, searchParams.get("q") ?? "", searchParams.get("cursor")),
  );
}
